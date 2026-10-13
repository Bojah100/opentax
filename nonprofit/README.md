# Local nonprofit intake prototype

Imports a ledger or screenshot into a reviewed local transaction list, then produces a dated bookkeeping worksheet. It does **not** prepare a completed 990, 990-EZ, Form PC, reinstatement application, or transmit a return. No nonprofit forms are registered in the upstream calculation catalog by this module.

Requires Node 22 or later. CSV import and review have no package dependencies. Run from the repository root:

```text
node nonprofit/local.mjs init
node nonprofit/local.mjs import-csv nonprofit/examples/ledger.csv nonprofit/examples/mapping.json
node nonprofit/local.mjs list
```

These examples are synthetic. Copy each returned transaction ID into a review command:

```text
node nonprofit/local.mjs review DONATION_ID approve nonprofit/examples/approve-donation.json
node nonprofit/local.mjs review PRINTING_ID approve nonprofit/examples/approve-printing.json
node nonprofit/local.mjs worksheet 2020-01-01 2020-12-31
```

Expected synthetic worksheet: 10010 cents receipts, 4005 cents payments, 6005 cents difference. These amounts are bookkeeping movements, not tax-return line calculations.

## Import your ledger locally

Export the relevant sheet from Excel or LibreOffice as UTF-8 CSV. Native XLSX import is not implemented. Preserve the original file. Dates must be YYYY-MM-DD; convert ambiguous spreadsheet dates before importing. Create a mapping JSON using your actual column headings. Supported targets:

- `date`, `description`, `counterparty`, `account`, `reference`, `program`
- Either `money_in` and `money_out`, or `amount` and `kind` (nonnegative dollar strings and explicit income/expense/transfer/adjustment)
- Optional `category` and expense `function`

The two-column mode assumes money in is income and money out is expense, pending review. Correct transfers, loans, refunds, and other exceptions before approving. Split entries with both incoming and outgoing amounts into separate rows. Keep gross donations and payment-processing fees separate when the source supports that breakdown. Never infer gross donations from a net deposit alone. Blank amount in amount/kind mode remains unknown. No currency conversion is provided.

All imports start pending, even pre-categorized ledger entries. The worksheet uses only approved entries. Use `review ID reject` to exclude a duplicate or nontransaction row. A repeat file hash is blocked. Same-date/amount matches or same-account/reference matches are flagged for review across files, including screenshots. If a flagged entry is genuinely a separate transaction, include `"duplicateResolution": "distinct"` in its approval patch. Duplicate flags are candidates, not proof; two legitimate equal donations can occur on the same day. Review patches and prior values are recorded in the local audit history.

## Screenshots with Ollama

Install Tesseract locally and make its executable available on PATH. Start Ollama with an installed local text model. For example, if `ollama list` confirms qwen2.5:3b:

```text
node nonprofit/local.mjs import-screenshot C:/your/local/screenshot.png qwen2.5:3b
node nonprofit/local.mjs list
```

Only PNG/JPEG images are accepted. Tesseract reads the image; extracted text is sent to `127.0.0.1:11434` with redirects disabled. Use an entirely local Ollama model and configuration: this application cannot independently guarantee what another locally running server does with requests. Obvious cloud model names are rejected. No arbitrary model-provided commands are executed.

Model output is untrusted and validated. OCR/model errors, missing years, unknown amounts, totals mistaken for transactions, and lost rows still require human comparison with the original screenshot. The raw OCR and extraction response are stored as source evidence. This is extraction, not autonomous approval or tax advice. Screenshot integration has automated simulated-provider tests; actual OCR/Ollama accuracy must be tested on the target laptop.

## Storage and review

Data is stored in `.nonprofit-local/ledger.json`, excluded from Git. `NONPROFIT_DATA_DIR` can select a different directory; keep it outside tracked source trees. Local files are not encrypted by this prototype. Original source files remain in their original locations; retain them for audit. Store backups locally according to your own data policy. No real records belong in examples or commits.

Writes use a lock and atomic rename. After an interrupted process, inspect whether a writer is still active before manually removing a stale `ledger.lock`. Review output is JSON in this first version; a visual review interface is not implemented.

All worksheet amounts are integer cents. Start/end dates support fiscal periods. Transfers and adjustments are shown separately and excluded from receipt/payment totals. Neither those totals nor their difference substitute for federal gross receipts, tax revenue, MA gross support and revenue, or net assets. The app does not yet reconcile opening/closing balances, accrual accounting, refunds, or tax-specific adjustments.

An empty period is reported as no approved entries, not a confirmation of no activity or no filing requirement. Unknown dates remain pending on every worksheet. Organization details, balance sheets, program narratives, officers, donor/support history and triggered schedules remain future modules. 2020–2025 tax rules must be implemented and reviewed separately.

## Tests

```text
node --test nonprofit/intake.test.mjs
```

Tests cover exact money parsing, dates, CSV quoting, explicit column mapping, pending entries, duplicate resolution, fiscal periods, transfer exclusion, audit history, mocked OCR/Ollama boundaries, persistence and locking. They do not establish tax correctness or upstream 1040 accuracy.

## License

Upstream LICENSE, NOTICE, and LICENSE.commercial are preserved. In particular, NOTICE claims additional restrictions concerning IRS MeF authorization. The interaction with the AGPL grant needs clarification before adopting this fork as an unrestricted public filing/transmission service.
