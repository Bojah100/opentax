# TY2025 cooperative patron saved-return and submission replay

## October 12 checkpoint

All 34 retained one-business patron cases now exercise JSON saving/reopening,
complete native preparation, individual submission ZIPs and mixed containers.
The cases comprise seven Single, seven HOH, seven QSS, seven MFS, three joint
primary-owned and three joint spouse-owned returns. They retain farm and
Schedule C health-plan sources, wage limits, phase-in, income caps, cooperative
payments, box 6 written notices and applicable spouse payroll.

Each case receives distinct synthetic taxpayer/spouse TINs across its sources.
Every native ReturnData element and reference matches live preparation, and all
persisted pending values match after JSON normalization. Cooperative sources and
reviews remain equal in the public inventory, Form1099-PATR, parent Form8995-A
and Schedule D; actual Schedule C/F and SE owner SSNs also match. MFS domicile,
separate-income and spouse-deduction review survives reopening.

Independent Python inspection compares all 34 complete native trees to earlier
retained packet artifacts, changing only the intended synthetic TINs. All 34
return XMLs and 34 manifests pass the cached IRS 2025v5.4 schemas. Forward and
reverse 34-return containers preserve every exact inner ZIP, submission ID,
electronic postmark, native document and manifest. These cases have no binary
attachments; none were removed to make the replay pass.

| Rejected alteration | Count |
| --- | ---: |
| Reopened payer, recipient, payroll, notice, allocation, business owner, QBI deduction, total tax or companion data | 306 |
| MFS review omitted, community domicile, wrong spouse, spouse itemization or mailing-state conflict | 35 |
| Another return's archived XML or manifest | 68 |
| Another return's filer, prepared bundle or residency review | 102 |
| Duplicate document ID or dangling reference with rebuilt ZIP and recomputed XML digest | 68 |
| Missing joint spouse residency review | 6 |
| Duplicate submission ID | 1 |

All 586 alterations reject: 341 at reopened preparation and 245 at the archive
or container boundary. Source changes are mirrored across retained copies, so
rejection does not rely on one untouched duplicate. The new focused replay passes;
the complete submission directory passes 51 typed tests, zero failed or ignored.
Focused lint, formatting and diff checks pass.

This checkpoint changes tests and evidence only. The earlier source-to-tax and
qualified PDF observations remain the calculation/presentation evidence; no new
PDFs are generated and complete-return/PDF totals do not increase. Presentation
findings 3/68/76, external source authentication, actual transmission, credentials,
service signing and IRS acceptance remain separate. Deferred A2A-ledger41,
replaced-statement148 and local-rule162 issues are not repaired or certified by
these ZIP checks. No broad main-board parent is closed and no future work is done.

Evidence: `.state/research/submission-patron-2026-10-12/` retains all34
source/filer/pending records, native/manifest/ZIP sets, both containers, mutation
counts, original-packet comparisons, schema paths/digests and successful logs.
The prior HOH/QSS/MFS packets are in `form8995a-patron-status-2026-10-12`;
Single/joint/spouse packets are in the individual patron reviewed batches under
`board-execution-2026-10-07`. The comparison records the exact prior path per case.

Reproduce with:

```sh
deno test -A forms/f1040/2025/mef/submissions/submission-patron-replay.test.ts
```
