import { z } from "zod";
import type { ScheduleCItem } from "./model.ts";

const common = {
  engagement_records_reference: z.string().trim().min(1),
  all_receipts_from_reviewed_services_confirmed: z.literal(true),
  revenue_records: z.array(
    z.object({
      invoice_reference: z.string().trim().min(1),
      service_description: z.string().trim().min(1),
      amount: z.number().int().positive(),
    }).strict(),
  ).min(1),
};

// TY2025 i8995a SSTB definitions. The business code corroborates the reviewed
// services; it does not replace the service/exclusion and receipt evidence.
export const sstbServiceClassificationSchema = z.discriminatedUnion("field", [
  z.object({
    ...common,
    field: z.literal("law"),
    unique_legal_skills_confirmed: z.literal(true),
    no_printing_delivery_stenography_confirmed: z.literal(true),
  }).strict(),
  z.object({
    ...common,
    field: z.literal("health"),
    medical_services_in_professional_capacity_confirmed: z.literal(true),
    no_health_club_processing_research_manufacturing_sales_confirmed: z.literal(
      true,
    ),
  }).strict(),
  z.object({
    ...common,
    field: z.literal("consulting"),
    professional_advice_counsel_for_separate_fee_confirmed: z.literal(true),
    no_sales_training_or_unpaid_ancillary_advice_confirmed: z.literal(true),
  }).strict(),
]);

const codes: Record<
  z.infer<typeof sstbServiceClassificationSchema>["field"],
  readonly string[]
> = {
  law: ["541100"],
  health: [
    "621111",
    "621112",
    "621210",
    "621310",
    "621320",
    "621330",
    "621340",
    "621391",
    "621399",
    "541940",
  ],
  consulting: ["541600"],
};

export function assertSstbServiceClassification(item: ScheduleCItem): void {
  const review = item.qbi_sstb_filing_review;
  if (!review) {
    throw Error("SSTB requires a retained service classification review");
  }
  const service = review.service_classification_review;
  if (!service) {
    if (
      review.accounting_sstb_confirmed !== true ||
      item.line_b_business_code !== "541211"
    ) {
      throw Error(
        "Accounting SSTB needs its reviewed accounting classification and business code",
      );
    }
    return;
  }
  const references = service.revenue_records.map((row) =>
    row.invoice_reference
  );
  if (
    review.accounting_sstb_confirmed !== undefined ||
    !codes[service.field].includes(item.line_b_business_code) ||
    review.business_activity_description !== item.line_a_principal_business ||
    new Set(references).size !== references.length ||
    service.revenue_records.reduce((total, row) => total + row.amount, 0) !==
      item.line_1_gross_receipts ||
    (item.line_2_returns_allowances ?? 0) !== 0 ||
    (item.line_6_other_income ?? 0) !== 0
  ) {
    throw Error(
      "SSTB service classification and distinct revenue records must reconcile the actual business and all gross receipts",
    );
  }
}
