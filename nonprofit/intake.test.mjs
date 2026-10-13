import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { money, isoDate, parseCSV, mapCSV, importRows, newLedger, review, worksheet } from './intake.mjs';
import { screenshotRows } from './local.mjs';

const row = (overrides = {}) => ({ date: '2020-06-05', description: 'Synthetic donation', amount: '100.10', kind: 'income', category: 'contributions', ...overrides });
const source = (sha256 = 'synthetic-a') => ({ sha256, filename: 'synthetic.csv', kind: 'csv' });

test('money uses exact cents and rejects ambiguous input', () => {
  assert.equal(money('0.10'), 10); assert.equal(money('$1,234.56'), 123456);
  assert.equal(money('(20.01)'), -2001); assert.equal(money(''), null);
  for (const v of ['1,23', '1e3', 'NaN', '1.999', '9007199254740992', '(-1)']) assert.throws(() => money(v));
  assert.throws(() => money(1.2));
});
test('invalid and ambiguous dates do not pass', () => {
  assert.equal(isoDate('2020-02-29'), '2020-02-29');
  for (const date of ['2021-02-29', '06/05/20', '2020-13-01']) assert.throws(() => isoDate(date));
});
test('CSV handles BOM, escaped quotes and multiline descriptions', () => {
  const rows = parseCSV('\uFEFFDate,Description,Amount\r\n2020-06-05,"Flyers, ""printing""\nfor event",40.00\r\n');
  assert.equal(rows[0].cells.Description, 'Flyers, "printing"\nfor event');
  for (const text of ['a,a\n1,2', 'a,b\n1', 'a\n"unfinished', 'a\n"x"oops']) assert.throws(() => parseCSV(text));
});
test('separate income/expense columns map explicitly and reject ambiguous movement', () => {
  const mapping = { date: 'Date', description: 'Memo', money_in: 'In', money_out: 'Out' };
  const rows = mapCSV('Date,Memo,In,Out\n2020-06-05,Gift,100,\n2020-06-06,Fee,,2', mapping);
  assert.equal(rows[0].cells.kind, 'income'); assert.equal(rows[1].cells.kind, 'expense');
  assert.throws(() => mapCSV('Date,Memo,In,Out\n2020-06-05,Gift,100,2', mapping));
  assert.throws(() => mapCSV('Date,Memo,In,Out\n2020-06-05,Gift,,', mapping));
  assert.throws(() => mapCSV('Date\n2020-06-05', mapping));
  assert.throws(() => mapCSV('Date\n2020-06-05', { arbitrary: 'Date' }));
});
test('imports are pending, missing amounts stay unknown, errors are atomic', () => {
  const original = newLedger();
  const ledger = importRows(original, [row({ amount: '' })], source());
  assert.equal(original.transactions.length, 0);
  assert.equal(ledger.transactions[0].amountCents, null);
  assert.throws(() => review(ledger, ledger.transactions[0].id, 'approve'));
  assert.throws(() => importRows(original, [row(), row({ amount: 'bad' })], source()));
  assert.equal(original.transactions.length, 0);
  assert.throws(() => importRows(ledger, [row()], source()));
  assert.equal(worksheet(ledger, '2020-01-01', '2020-12-31').receiptTotal, 0);
});
test('overlapping sources require an explicit duplicate decision', () => {
  let ledger = importRows(newLedger(), [row()], source());
  ledger = review(ledger, ledger.transactions[0].id, 'approve');
  ledger = importRows(ledger, [row({ description: 'OCR: donation' })], source('screenshot-b'));
  const id = ledger.transactions[1].id;
  assert.equal(ledger.transactions[1].duplicateOf.length, 1);
  assert.throws(() => review(ledger, id, 'approve'));
  const rejected = review(ledger, id, 'reject');
  assert.equal(worksheet(rejected, '2020-01-01', '2020-12-31').receiptTotal, 10010);
  const distinct = review(ledger, id, 'approve', { duplicateResolution: 'distinct' });
  assert.equal(worksheet(distinct, '2020-01-01', '2020-12-31').receiptTotal, 20020);
});
test('worksheet respects fiscal dates, excludes transfers, and uses exact amounts', () => {
  let ledger = importRows(newLedger(), [
    row({ amount: '0.10' }), row({ amount: '0.20', date: '2020-06-06' }),
    row({ date: '2020-07-01', amount: '10' }),
    row({ date: '2020-06-07', amount: '500', kind: 'transfer', category: 'transfer' }),
    row({ date: '2020-06-08', amount: '0.05', kind: 'expense', category: 'printing_postage', function: 'program' }),
  ], source());
  for (const t of ledger.transactions) ledger = review(ledger, t.id, 'approve');
  const w = worksheet(ledger, '2019-07-01', '2020-06-30');
  assert.equal(w.receiptTotal, 30); assert.equal(w.paymentTotal, 5); assert.equal(w.receiptMinusPayment, 25);
  assert.equal(w.functionalExpenses.program, 5); assert.equal(w.totals['transfer.transfer'], 50000);
  assert.throws(() => worksheet(ledger, '2021-01-01', '2020-01-01'));
});
test('expense allocation and review patch validation are required', () => {
  const ledger = importRows(newLedger(), [row({ kind: 'expense', category: 'other_expense' })], source());
  const id = ledger.transactions[0].id;
  assert.throws(() => review(ledger, id, 'approve'));
  assert.throws(() => review(ledger, id, 'approve', { sourceId: 'fake' }));
  assert.throws(() => review(ledger, id, 'approve', { description: {} }));
  const result = review(ledger, id, 'approve', { function: 'administration' });
  assert.equal(result.audit.at(-1).before.status, 'pending');
  assert.equal(result.audit.at(-1).after.status, 'approved');
});
test('empty year is explicitly incomplete, not a no-activity assertion', () => {
  const w = worksheet(newLedger(), '2023-01-01', '2023-12-31');
  assert.match(w.status, /DRAFT/); assert(w.warnings.some(x => x.includes('not evidence')));
});
test('screenshot path uses local OCR and loopback only; model rows remain pending', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nonprofit-ocr-'));
  try {
    const path = join(dir, 'image.png');
    await writeFile(path, Buffer.from([137,80,78,71,13,10,26,10]));
    const run = (exe, args) => { assert.equal(exe, 'tesseract'); assert.equal(args[0], path); return { status: 0, stdout: '2020-06-05 Gift $100.10' }; };
    const fetcher = async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:11434/api/chat');
      assert.equal(options.redirect, 'error');
      assert.equal(JSON.parse(options.body).stream, false);
      return { ok: true, json: async () => ({ message: { content: JSON.stringify({ transactions: [{ date: '2020-06-05', description: 'Gift', amount: '100.10', kind: 'income' }] }) } }) };
    };
    const extracted = await screenshotRows(path, 'qwen2.5:3b', fetcher, run);
    assert.equal(importRows(newLedger(), extracted.rows, extracted.source).transactions[0].status, 'pending');
    await assert.rejects(() => screenshotRows(path, 'model:cloud', fetcher, run));
    await assert.rejects(() => screenshotRows(path, 'qwen2.5:3b', fetcher, () => ({ error: new Error('missing') })));
    await assert.rejects(() => screenshotRows(path, 'qwen2.5:3b', async () => ({ ok: true, json: async () => ({ message: { content: '{"transactions":[{"command":"delete"}]}' } }) }), run));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('CLI persists review and refuses overwrites and competing writers', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nonprofit-cli-'));
  const cli = fileURLToPath(new URL('./local.mjs', import.meta.url));
  const call = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, NONPROFIT_DATA_DIR: dir } });
  try {
    assert.equal(call('init').status, 0); assert.notEqual(call('init').status, 0);
    const csv = join(dir, 'synthetic.csv'), mapping = join(dir, 'map.json');
    await writeFile(csv, 'Date,Memo,Amount,Kind,Category\n2020-06-05,Synthetic gift,100.10,income,contributions');
    await writeFile(mapping, JSON.stringify({ date:'Date',description:'Memo',amount:'Amount',kind:'Kind',category:'Category' }));
    const imported = call('import-csv', csv, mapping);
    assert.equal(imported.status, 0, imported.stderr);
    assert.notEqual(call('import-csv', csv, mapping).status, 0);
    const id = JSON.parse(call('list').stdout)[0].id;
    assert.equal(call('review', id, 'approve').status, 0);
    assert.equal(JSON.parse(call('worksheet', '2020-01-01', '2020-12-31').stdout).receiptTotal, 10010);
    await writeFile(join(dir, 'ledger.lock'), 'test');
    assert.notEqual(call('list').status, 0);
    assert.equal(JSON.parse(await readFile(join(dir, 'ledger.json'))).transactions.length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
