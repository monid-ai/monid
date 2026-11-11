import { z } from "zod";
import {
    zCompanyName,
    zCountryCode,
    zDomain,
    zEnrichMobile,
} from "../../../schema/common.ts";

/** GET /domain-search query — the vendor mirror (docs.tomba.io
 *  api/finder#domain-search, 2026-11-11). Send `domain` or `company`;
 *  bound as a union in endpoint.ts. `webhook_url` is left out (design
 *  D5). */
export const zDomainSearchQueryParams = z.object({
    domain: zDomain.optional(),
    company: zCompanyName.describe(
        "Company name, such as 'Stripe'. When Tomba knows the company, its " +
            "domain is searched, even if you also send domain. An unknown " +
            "company fails with 422 unless you also send domain.",
    ).optional(),
    page: z.number().int().min(1).describe(
        "Page number, starting at 1 (default 1).",
    ).optional(),
    limit: z.literal([
        1,
        5,
        10,
        20,
        50,
        100,
        150,
        200,
        250,
        300,
        350,
        400,
        450,
        500,
        5000,
    ]).describe(
        "Number of addresses per page (vendor default 10). Billed at 1 " +
            "search credit per 10 requested, rounded up. On the Free plan " +
            "outside a workspace, a value above 10 fails with 400.",
    ).optional(),
    country: zCountryCode.describe(
        "Two-letter country code (ISO 3166-1 alpha-2), such as 'US', to " +
            "return only people in that country.",
    ).optional(),
    department: z.string().min(1).describe(
        "Return only people in these departments, comma-separated, such as " +
            "'engineering,sales'. Values: accounting, administrative, " +
            "communication, diversity, education, engineering, executive, " +
            "facilities, finance, healthcare, hr, it, legal, management, " +
            "marketing, operations, pr, sales, security, software, support, " +
            "warehouse. Unknown values are ignored.",
    ).optional(),
    type: z.enum(["all", "personal", "generic"]).describe(
        "'personal' returns only addresses that belong to one person, " +
            "'generic' only role addresses such as support@ (default 'all').",
    ).optional(),
    enrich_mobile: zEnrichMobile.describe(
        "Set to true to also get each person's phone numbers in " +
            "`phone_data`. Each returned address with phone data costs 5 " +
            "extra search credits.",
    ).optional(),
}).strict();
