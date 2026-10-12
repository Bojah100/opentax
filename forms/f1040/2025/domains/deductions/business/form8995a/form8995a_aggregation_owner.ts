import {
  type FilerIdentity,
  FilingStatus as HeaderStatus,
} from "../../../../../mef/header.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";
import type { Form8995AInput } from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";

/** Bind a validated direct-owner group or existing single-filer RPE to its filer. */
export function aggregationOwner(input: Form8995AInput, filer?: FilerIdentity) {
  const joint = input.filing_status === FilingStatus.MFJ;
  const recipient =
    input.aggregation_filing_details?.members[0]?.source_schedule_c
      .proprietor_recipient ?? TS.T;
  const expectedSsn = input.aggregation_filing_details?.common_owner_ssn ??
    input.rpe_aggregation_source?.recipient_tin;
  const spouseOwned = recipient === TS.S;
  const ssn = (spouseOwned ? filer?.spouse?.ssn : filer?.primarySSN)
    ?.replaceAll("-", "");
  if (
    !filer ||
    filer.filingStatus !==
      (joint ? HeaderStatus.MarriedFilingJointly : HeaderStatus.Single) ||
    (input.filing_status !== FilingStatus.Single && !joint) ||
    (joint &&
      (!filer.spouse ||
        filer.spouse.ssn.replaceAll("-", "") ===
          filer.primarySSN.replaceAll("-", ""))) ||
    (spouseOwned && !joint) || !ssn || ssn !== expectedSsn
  ) {
    throw new Error(
      "Form 8995-A Schedule B needs matching parent, companion, filer, and actual common-owner identity",
    );
  }
  const name = spouseOwned
    ? [
      filer.spouse!.firstName,
      filer.spouse!.middleInitial,
      filer.spouse!.lastName,
      filer.spouse!.suffix,
    ].filter(Boolean).join(" ")
    : filer.nameLine1 ?? filer.fullName ?? "";
  return { ssn, name };
}
