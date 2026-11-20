import { z } from "zod";

/** GET /companies query params — jobs-api `routes/companies.ts`
 *  (2026-10-29): `q` (2–80 characters, required) and `limit`. */
export const zCompaniesSearchQueryParams = z.object({
    q: z.string().describe(
        "Employer name or slug to look up, e.g. 'stripe' or 'Johnson & " +
            "Johnson'. A trailing 'jobs' or 'careers' is ignored.",
    ).min(2).max(80),
    limit: z.number().int().min(1).max(20).describe(
        "Results (1–20, default 5).",
    ).optional(),
});
