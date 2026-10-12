# TY2025 SSTB saved-return and submission replay — October 12

All 59 retained SSTB packets now exercise saving pending data as JSON, reopening
it, preparing native documents and building individual and mixed submission ZIPs.
They cover all five filing statuses, either joint business owner, mixed-owner
investments, partial/capped wage bases, income limits and 12 zero deductions,
plus 12 legal, medical and consulting cases and nine financial-service,
brokerage and investment-management cases, plus nine actuarial/arts/athletic cases.
No production calculation or archive implementation changes.

Each packet has a distinct synthetic taxpayer identity. The test compares every
native ReturnData document and reference with the same live source preparation,
and compares all persisted pending values. Optional undefined properties are
omitted by JSON; neither tax amounts nor source records may change. It also
checks actual Schedule C/SE proprietor TINs and the native QBI deduction.

Two 59-return containers, in forward and reverse order, preserve every exact
inner ZIP, submission ID and electronic postmark. Each archive has exactly a
manifest and native return; these retained cases require no binary attachment.

| Rejected alteration | Count |
| --- | ---: |
| Reopened retained owner, issued owner, settled QBI or duplicated business | 236 |
| Missing service classification, changed receipt total or excluded service, mirrored in all stored source copies | 90 |
| Changed financial-service kind conflicting with the retained activity code, mirrored in all source copies | 4 |
| Another return's archived native XML or manifest | 118 |
| Another return's filer, prepared bundle or residency review | 177 |
| Duplicate document ID or inserted dangling reference, with recomputed digest and ZIP | 118 |
| Missing joint spouse review | 24 |
| Duplicate submission ID | 1 |

All 768 alterations reject: 330 at preparation and 438 at the archive/container
boundary. The full submission directory passes 50 typed tests with zero failures or
ignored tests, including the focused replay; focused lint and diff checks pass.
Independent Python XML/ZIP
inspection additionally compares all 59 native ReturnData trees with the prior
retained packet artifacts, changing only synthetic identity values. Both
containers preserve the independently inspected inner bytes. Full Return1040
and manifest XSD validation adds 118 passing schema checks for these replays.
Schema paths/digests and per-packet ZIP hashes are retained with the proof.

The original zero-MFS case still has total tax 57,813 rather than independently
expected 57,814 (deferred 156); faithful storage is not a correction of that known
issue. Prior presentation 3/68/76 and conditional PartIII 163 qualifications also
remain. Synthetic residency, software and originator values are not verified
filing credentials. Service-WSDL/signing, actual transmission, accepted IRS
acknowledgments, deferred A2A-ledger 41 and replaced-statement 148 are outside this
archive proof. Existing full-return and reviewed-PDF totals are not incremented.
No new deferred task was discovered and no broad main-board parent is closed.

Evidence: `.state/research/submission-sstb-professional-2026-10-12/` retains 59
source/filer/persisted-pending records, 59 native/manifest/ZIP sets, two containers,
source/archive mutation counts, prior-packet comparisons and schema logs. Earlier
29-, 41- and 50-case proofs remain in the corresponding `submission-sstb-replay`,
`submission-sstb-services` and `submission-sstb-financial` October12 evidence roots.
The expanded proof adds nine actuarial/arts/athletic returns without changing
earlier synthetic identities; their native packets match
`.state/research/form8995a-sstb-professional-2026-10-12/`.

Classification assertions, professional roles, invoice totals and financial
service kinds survive JSON storage. The 94 classification alterations start
from successfully prepared pending data; they do not exercise or repair the
public calculation-error route recorded as future161. Counts replace the earlier
638-mutation archive total rather than adding the earlier cases twice.

Reproduce the focused check with:

```sh
deno test -A forms/f1040/2025/mef/submissions/submission-sstb-replay.test.ts
```
