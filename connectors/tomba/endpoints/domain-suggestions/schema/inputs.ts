import { z } from "zod";

/** GET /domain-suggestions query — the vendor mirror (docs.tomba.io
 *  api/domain-suggestions, 2026-11-11). */
export const zDomainSuggestionsQueryParams = z.object({
    query: z.string().min(1).max(100).describe(
        "Company name or domain to match, such as 'stripe'.",
    ).optional(),
}).strict();
