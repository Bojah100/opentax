// SPDX-License-Identifier: AGPL-3.0-only
// Local bookkeeping intake. This module does not determine tax eligibility.
import { createHash, randomUUID } from 'node:crypto';

export const categories = {
  income: ['contributions', 'program_revenue', 'membership', 'investment_income',
    'fundraising_receipts', 'gaming_receipts', 'merchandise_sales', 'asset_sale_proceeds', 'other_income'],
  expense: ['grants_paid', 'compensation', 'contractors', 'occupancy', 'printing_postage',
    'processing_fees', 'event_direct_costs', 'inventory_costs', 'other_expense'],
  transfer: ['transfer'],
  adjustment: ['loan_proceeds', 'loan_repayment', 'other_adjustment'],
};
export const functions = ['program', 'administration', 'fundraising'];
export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (message) => { throw new Error(message); };

export function money(value) {
  // Explicit dollars, never floating-point arithmetic. Blank means unknown.
  if (typeof value !== 'string') fail('Amounts must be decimal strings');
  let s = value.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s);
  if (negative) s = s.slice(1, -1);
  s = s.replace(/^\$/, '');
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s)) fail(`Invalid dollar amount: ${value}`);
  if (negative && s.startsWith('-')) fail('Double negative amount');
  s = s.replaceAll(',', '');
  const sign = negative || s.startsWith('-') ? -1n : 1n;
  const [whole, fraction = ''] = s.replace(/^-/, '').split('.');
  const cents = sign * (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) fail('Amount too large');
  return Number(cents);
}

export function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Dates must use YYYY-MM-DD');
  if (new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value) fail(`Invalid date: ${value}`);
  return value;
}

export function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"') {
      if (field || closed) fail('Unexpected quote in CSV');
      quoted = true;
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(field); field = ''; closed = false;
      if (c !== ',') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        if (row.some(x => x !== '')) rows.push(row);
        row = [];
      }
    } else {
      if (closed) fail('Unexpected text after CSV closing quote');
      field += c;
    }
  }
  if (quoted) fail('Unclosed CSV quote');
  if (field || row.length || closed) { row.push(field); rows.push(row); }
  if (!rows.length) fail('Empty CSV');
  const headers = rows.shift().map(h => h.trim());
  if (headers.some(h => !h) || new Set(headers).size !== headers.length) fail('CSV headers must be unique and nonempty');
  return rows.map((values, i) => {
    if (values.length !== headers.length) fail(`CSV record ${i + 2}: wrong column count`);
    return { record: i + 2, cells: Object.fromEntries(headers.map((h, j) => [h, values[j]])) };
  });
}

export function newLedger() {
  return { version: 1, organization: {}, sources: [], transactions: [], audit: [] };
}

function candidate(raw, sourceId, record) {
  const get = key => typeof raw[key] === 'string' ? raw[key].trim() : '';
  const date = get('date') || null;
  if (date) isoDate(date);
  const amountCents = money(get('amount'));
  const entry = {
    id: randomUUID(), sourceId, record, date, description: get('description'),
    counterparty: get('counterparty'), account: get('account'), reference: get('reference'),
    amountCents, kind: get('kind') || null, category: get('category') || null,
    function: get('function') || null, program: get('program'),
    status: 'pending', duplicateOf: [], duplicateResolution: null,
  };
  if (amountCents !== null && amountCents < 0) fail('Use a nonnegative amount and an explicit kind');
  if (entry.kind && !categories[entry.kind]) fail('Unknown transaction kind');
  if (entry.category && (!entry.kind || !categories[entry.kind].includes(entry.category))) fail('Category does not match kind');
  if (entry.function && !functions.includes(entry.function)) fail('Unknown expense function');
  return entry;
}

function duplicate(a, b) {
  if (a.amountCents === null || b.amountCents === null) return false;
  const sameRef = a.reference && a.reference === b.reference && a.account === b.account;
  const sameDateAmount = a.date && a.date === b.date && a.amountCents === b.amountCents;
  // Broad matching deliberately requires review; never silently delete a row.
  return Boolean(sameRef || sameDateAmount);
}

export function importRows(ledger, rows, source) {
  if (ledger.sources.some(s => s.sha256 === source.sha256)) fail('This source file was already imported');
  if (!rows.length) fail('No transactions found');
  const next = structuredClone(ledger);
  const sourceId = randomUUID();
  for (const [index, raw] of rows.entries()) {
    let entry;
    try { entry = candidate(raw.cells ?? raw, sourceId, raw.record ?? index + 1); }
    catch (e) { fail(`Record ${raw.record ?? index + 1}: ${e.message}`); }
    entry.duplicateOf = next.transactions.filter(t => t.status !== 'rejected' && duplicate(entry, t)).map(t => t.id);
    next.transactions.push(entry);
  }
  next.sources.push({ ...source, id: sourceId, importedAt: new Date().toISOString() });
  next.audit.push({ at: new Date().toISOString(), action: 'import', sourceId, count: rows.length });
  return next;
}

export function mapCSV(text, mapping) {
  // Column names must be explicit; do not guess bank debit/credit conventions.
  const allowed = new Set(['date', 'description', 'counterparty', 'account', 'reference', 'program', 'amount', 'kind', 'category', 'function', 'money_in', 'money_out']);
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping) ||
      Object.entries(mapping).some(([key, value]) => !allowed.has(key) || typeof value !== 'string')) fail('Invalid column mapping');
  if (!mapping.date || !mapping.description || (!mapping.amount && !mapping.money_in && !mapping.money_out)) fail('Map date, description, and amount or money-in/money-out columns');
  return parseCSV(text).map(({ cells, record }) => {
    const result = {};
    for (const [target, header] of Object.entries(mapping)) {
      if (!Object.hasOwn(cells, header)) fail(`Missing CSV column: ${header}`);
      result[target] = cells[header];
    }
    if ('money_in' in result || 'money_out' in result) {
      if ('amount' in result || 'kind' in result) fail('Use money_in/money_out OR amount/kind mapping');
      const incoming = money(result.money_in ?? '') ?? 0;
      const outgoing = money(result.money_out ?? '') ?? 0;
      if (incoming < 0 || outgoing < 0 || (incoming && outgoing)) fail(`Record ${record}: split or correct ambiguous money-in/money-out values`);
      if (!incoming && !outgoing) fail(`Record ${record}: no nonzero movement; use amount/kind mapping for intentional zero entries`);
      result.amount = incoming ? result.money_in : result.money_out;
      result.kind = incoming ? 'income' : 'expense';
      delete result.money_in; delete result.money_out;
    }
    return { cells: result, record };
  });
}

export function review(ledger, id, decision, patch = {}) {
  if (!['approve', 'reject'].includes(decision)) fail('Decision must be approve or reject');
  const next = structuredClone(ledger);
  const entry = next.transactions.find(t => t.id === id);
  if (!entry) fail('Unknown transaction ID');
  const allowed = ['date', 'description', 'counterparty', 'account', 'reference', 'amount', 'kind', 'category', 'function', 'program', 'duplicateResolution'];
  if (Object.keys(patch).some(k => !allowed.includes(k))) fail('Unknown review field');
  if (Object.values(patch).some(v => typeof v !== 'string')) fail('Review fields must be strings');
  const before = structuredClone(entry);
  entry.duplicateResolution = null;
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'amount') entry.amountCents = money(v);
    else entry[k] = v;
  }
  if (decision === 'approve') {
    isoDate(entry.date);
    if (!Number.isSafeInteger(entry.amountCents) || entry.amountCents < 0) fail('Review requires a nonnegative amount');
    if (!entry.description?.trim()) fail('Review requires a description');
    if (!categories[entry.kind]?.includes(entry.category)) fail('Review requires a valid kind/category');
    if (entry.kind === 'expense' && !functions.includes(entry.function)) fail('Expense requires program, administration, or fundraising allocation');
    const matches = next.transactions.filter(t => t.id !== id && t.status !== 'rejected' && duplicate(entry, t)).map(t => t.id);
    entry.duplicateOf = matches;
    if (matches.length && entry.duplicateResolution !== 'distinct') fail('Possible duplicate: reject it or explicitly mark duplicateResolution as distinct');
  }
  entry.status = decision === 'approve' ? 'approved' : 'rejected';
  next.audit.push({ at: new Date().toISOString(), action: decision, id, before, after: structuredClone(entry) });
  return next;
}

export function worksheet(ledger, start, end) {
  isoDate(start); isoDate(end);
  if (start > end) fail('Period start is after end');
  const add = (a, b) => { const n = a + b; if (!Number.isSafeInteger(n)) fail('Total exceeds safe monetary range'); return n; };
  const totals = {}, functional = Object.fromEntries(functions.map(f => [f, 0]));
  const entries = ledger.transactions.filter(t => t.status === 'approved' && t.date >= start && t.date <= end);
  let receipts = 0, payments = 0;
  for (const t of entries) {
    const key = `${t.kind}.${t.category}`;
    totals[key] = add(totals[key] ?? 0, t.amountCents);
    if (t.kind === 'income') receipts = add(receipts, t.amountCents);
    if (t.kind === 'expense') { payments = add(payments, t.amountCents); functional[t.function] = add(functional[t.function], t.amountCents); }
  }
  const pending = ledger.transactions.filter(t => t.status === 'pending' && (!t.date || (t.date >= start && t.date <= end))).map(t => t.id);
  return {
    status: 'DRAFT_BOOKKEEPING_WORKSHEET_NOT_A_TAX_RETURN', start, end, currency: 'USD', unit: 'cents',
    reviewedEntryCount: entries.length, pendingEntryIds: pending,
    totals, functionalExpenses: functional, receiptTotal: receipts, paymentTotal: payments,
    receiptMinusPayment: add(receipts, -payments),
    includedEntryIds: entries.map(t => t.id),
    warnings: [
      'These are reviewed bookkeeping amounts, not federal gross receipts, taxable income, or Massachusetts gross support and revenue.',
      'No year-specific tax eligibility, Schedule A/B, exemption-status, or filing determination has been implemented.',
      'Opening/closing assets and liabilities, accounting adjustments, organization details, programs, officers, and required disclosures remain separate inputs.',
      ...(!entries.length ? ['No approved entries is not evidence of no activity.'] : []),
      ...(pending.length ? ['Unreviewed entries are excluded.'] : []),
    ],
  };
}
