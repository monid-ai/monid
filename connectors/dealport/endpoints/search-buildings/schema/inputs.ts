import { z } from "zod";

/**
 * `GET /api/v1/buildings` query parameters mirror
 * (https://app.dealport.com/openapi/v1.json). Optionality only; `min_units`
 * and `limit` defaults attach at the binding in `endpoint.ts`.
 */
export const zSearchBuildingsQueryParams = z.object({
    borough: z.enum(["MN", "BK", "QN", "BX", "SI"]).describe(
        "NYC borough code: MN (Manhattan), BK (Brooklyn), QN (Queens), BX (Bronx), or SI (Staten Island).",
    ),
    min_units: z.number().int().min(0).describe(
        "Minimum residential units (default 10).",
    ).optional(),
    q: z.string().min(1).describe(
        "Street address or owner-of-record substring filter.",
    ).optional(),
    loan_due_by: z.number().int().min(1990).max(2100).describe(
        "Estimated mortgage maturity year ceiling (e.g. 2027).",
    ).optional(),
    loan_holder: z.enum(["agency", "cmbs", "bank"]).describe(
        "Current mortgage holder category (`agency`, `cmbs`, or `bank`).",
    ).optional(),
    signal: z.enum([
        "rent_stabilized",
        "dob_penalties",
        "housing_court",
        "tax_lien",
        "ll97",
        "section8_expiring",
        "tax_credit_ending",
        "failing_inspection",
    ]).describe(
        "Regulatory, distress, or assisted-housing signal filter.",
    ).optional(),
    limit: z.number().int().min(1).max(50).describe(
        "Page size (1 to 50, default 25).",
    ).optional(),
    cursor: z.string().min(1).describe(
        "Pagination offset cursor returned as `next_cursor` from the prior page.",
    ).optional(),
}).strict();
