import {
  type FilerIdentity,
  FilingStatus as HeaderStatus,
} from "../../../../../mef/header.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";
import type { Form8995AInput } from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";

/** Bind a validated direct-owner group or issued RPE to its filer. */
export function aggregationOwner(input: Form8995AInput, filer?: FilerIdentity) {
  const joint = input.filing_status === FilingStatus.MFJ;
  const recipient =
    input.aggregation_filing_details?.members[0]?.source_schedule_c
      .proprietor_recipient ??
      (joint &&
          input.rpe_aggregation_source?.recipient_tin ===
            filer?.spouse?.ssn.replaceAll("-", "")
        ? TS.S
        : TS.T);
  const expectedSsn = input.aggregation_filing_details?.common_owner_ssn ??
    input.rpe_aggregation_source?.recipient_tin;
  const spouseOwned = recipient === TS.S;
  const ssn = (spouseOwned ? filer?.spouse?.ssn : filer?.primarySSN)
    ?.replaceAll("-", "");
  const statuses = {
    [FilingStatus.Single]: HeaderStatus.Single,
    [FilingStatus.MFJ]: HeaderStatus.MarriedFilingJointly,
    [FilingStatus.MFS]: HeaderStatus.MarriedFilingSeparately,
    [FilingStatus.HOH]: HeaderStatus.HeadOfHousehold,
    [FilingStatus.QSS]: HeaderStatus.QualifyingSurvivingSpouse,
  };
  const review = input.aggregation_mfs_review;
  if (
    input.filing_status === FilingStatus.MFS &&
    (!review || review.owner_ssn !== ssn ||
      review.spouse_ssn !== filer?.spouse?.ssn.replaceAll("-", "") ||
      review.spouse_ssn === ssn ||
      review.mailing_address_state !== filer?.address.state)
  ) {
    throw Error(
      "MFS aggregation must match its actual separate owner, spouse and reviewed address",
    );
  }
  if (
    !filer ||
    filer.filingStatus !== statuses[input.filing_status] ||
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
