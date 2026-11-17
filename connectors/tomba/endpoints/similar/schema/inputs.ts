import { z } from "zod";
import { zCompanyName, zDomain } from "../../../schema/common.ts";

/** GET /similar query — the vendor mirror (docs.tomba.io api/domain#similar,
 *  2026-11-11). Send `domain` or `company`; bound as a union in
 *  endpoint.ts. */
export const zSimilarQueryParams = z.object({
    domain: zDomain.optional(),
    company: zCompanyName.describe(
        "Company name, such as 'Stripe'. When Tomba knows the company, its " +
            "domain is used, even if you also send domain.",
    ).optional(),
    page: z.number().int().min(1).describe(
        "Page number, starting at 1 (default 1). Each page has up to 25 " +
            "companies.",
    ).optional(),
    limit: z.literal([10, 20, 50, 100, 150, 200, 250]).describe(
        "Accepted for compatibility (vendor default 10): it doesn't change " +
            "the page size, which is always 25, but it sets the cost — 1 " +
            "search credit per 10, rounded up.",
    ).optional(),
}).strict();
