import { z } from "zod";

/** GET /company query params — faithful mirror of the published OpenAPI
 *  (2026-10-12). */
export const zCompanyQueryParams = z.object({
    name_or_domain: z.string().min(2).max(120).describe(
        "The company's name (e.g. 'Supabase') or web domain (e.g. " +
            "'supabase.com'), 2-120 characters. A domain is the surest " +
            "match.",
    ),
}).strict();
