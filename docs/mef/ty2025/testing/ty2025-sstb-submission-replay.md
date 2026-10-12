# TY2025 SSTB saved-return and submission replay — October 12

All 41 retained SSTB packets now exercise saving pending data as JSON, reopening
it, preparing native documents and building individual and mixed submission ZIPs.
They cover all five filing statuses, either joint business owner, mixed-owner
investments, partial/capped wage bases, income limits and 12 zero deductions,
plus 12 legal, medical and consulting service cases.
No production calculation or archive implementation changes.

Each packet has a distinct synthetic taxpayer identity. The test compares every
native ReturnData document and reference with the same live source preparation,
and compares all persisted pending values. Optional undefined properties are
omitted by JSON; neither tax amounts nor source records may change. It also
checks actual Schedule C/SE proprietor TINs and the native QBI deduction.

Two 41-return containers, in forward and reverse order, preserve every exact
inner ZIP, submission ID and electronic postmark. Each archive has exactly a
manifest and native return; these retained cases require no binary attachment.

| Rejected alteration | Count |
| --- | ---: |
| Reopened retained owner, issued owner, settled QBI or duplicated business | 164 |
| Missing service classification, changed receipt total or excluded service, mirrored in all stored source copies | 36 |
| Another return's archived native XML or manifest | 82 |
| Another return's filer, prepared bundle or residency review | 123 |
| Duplicate document ID or inserted dangling reference, with recomputed digest and ZIP | 82 |
| Missing joint spouse review | 16 |
| Duplicate submission ID | 1 |

All 504 alterations reject: 200 at preparation and 304 at the archive/container
boundary. The full submission directory passes 50 typed tests with zero failures or
ignored tests, including the focused replay; focused lint and diff checks pass.
Independent Python XML/ZIP
inspection additionally compares all 41 native ReturnData trees with the prior
retained packet artifacts, changing only synthetic identity values. Both
containers preserve the independently inspected inner bytes. Full Return1040
and manifest XSD validation adds 82 passing schema checks for these replays.
Schema paths/digests and per-packet ZIP hashes are retained with the proof.

The original zero-MFS case still has total tax 57,813 rather than independently
expected 57,814 (deferred 156); faithful storage is not a correction of that known
issue. Prior presentation 3/68/76 and conditional PartIII 163 qualifications also
remain. Synthetic residency, software and originator values are not verified
filing credentials. Service-WSDL/signing, actual transmission, accepted IRS
acknowledgments, deferred A2A-ledger 41 and replaced-statement 148 are outside this
archive proof. Existing full-return and reviewed-PDF totals are not incremented.
No new deferred task was discovered and no broad main-board parent is closed.

Evidence: `.state/research/submission-sstb-services-2026-10-12/` retains 41 source,
filer and persisted-pending records, 41 native/manifest/ZIP sets, two containers,
source/archive mutation counts, prior-packet comparisons and schema logs.
The original 29-case proof remains in
`.state/research/submission-sstb-replay-2026-10-12/`; the expanded proof adds 12
service returns without changing earlier synthetic identities. The new cases
match the native packets in `.state/research/form8995a-sstb-services-2026-10-12/`.
Classification assertions and invoice totals survive JSON storage. The 36
classification alterations start from successfully prepared pending data; they
do not exercise or repair the public calculation-error route recorded as
future 161. These counts replace the earlier 332-mutation archive total rather
than adding the same earlier cases twice.

Reproduce the focused check with:

```sh
deno test -A forms/f1040/2025/mef/submissions/submission-sstb-replay.test.ts
```
