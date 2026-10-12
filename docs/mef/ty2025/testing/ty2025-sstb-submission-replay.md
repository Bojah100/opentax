# TY2025 SSTB saved-return and submission replay — October 12

All29 retained SSTB packets now exercise saving pending data as JSON, reopening
it, preparing native documents and building individual and mixed submission ZIPs.
They cover all five filing statuses, either joint business owner, mixed-owner
investments, partial/capped wage bases, income limits and12 zero deductions.
No production calculation or archive implementation changes.

Each packet has a distinct synthetic taxpayer identity. The test compares every
native ReturnData document and reference with the same live source preparation,
and compares all persisted pending values. Optional undefined properties are
omitted by JSON; neither tax amounts nor source records may change. It also
checks actual Schedule C/SE proprietor TINs and the native QBI deduction.

Two29-return containers, in forward and reverse order, preserve every exact
inner ZIP, submission ID and electronic postmark. Each archive has exactly a
manifest and native return; these retained cases require no binary attachment.

| Rejected alteration | Count |
| --- | ---: |
| Reopened retained owner, issued owner, settled QBI or duplicated business | 116 |
| Another return's archived native XML or manifest | 58 |
| Another return's filer, prepared bundle or residency review | 87 |
| Duplicate document ID or inserted dangling reference, with recomputed digest and ZIP | 58 |
| Missing joint spouse review | 12 |
| Duplicate submission ID | 1 |

All332 alterations reject:116 at preparation and216 at the archive/container
boundary. The full submission directory passes50 typed tests with zero failures or ignored
tests, including the focused replay; focused lint and diff checks pass.
Independent Python XML/ZIP
inspection additionally compares all29 native ReturnData trees with the prior
retained packet artifacts, changing only synthetic identity values. Both
containers preserve the independently inspected inner bytes. Full Return1040
and manifest XSD validation adds58 passing schema checks for these replays.
Schema paths/digests and per-packet ZIP hashes are retained with the proof.

The original zero-MFS case still has total tax57,813 rather than independently
expected57,814 (deferred156); faithful storage is not a correction of that known
issue. Prior presentation3/68/76 and conditional PartIII163 qualifications also
remain. Synthetic residency, software and originator values are not verified
filing credentials. Service-WSDL/signing, actual transmission, accepted IRS
acknowledgments, deferred A2A-ledger41 and replaced-statement148 are outside this
archive proof. Existing full-return and reviewed-PDF totals are not incremented.
No new deferred task was discovered and no broad main-board parent is closed.

Evidence: `.state/research/submission-sstb-replay-2026-10-12/` retains29 source,
filer and persisted-pending records,29 native/manifest/ZIP sets, two containers,
source/archive mutation counts, prior-packet comparisons and schema logs.
Reproduce the focused check with:

```sh
deno test -A forms/f1040/2025/mef/submissions/submission-sstb-replay.test.ts
```
