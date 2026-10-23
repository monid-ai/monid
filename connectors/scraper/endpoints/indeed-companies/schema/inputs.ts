import { z } from "zod";
import { zIndeedCompanyCountry } from "../../../schema/common.ts";

/**
 * `POST /indeed/companies` request body: the vendor mirror, optionality
 * only (D25). The vendor runs in lookup mode when `companyKeys` is
 * non-empty and in search mode otherwise.
 */
export const zIndeedCompaniesBody = z.object({
    keyword: z.string().max(200).optional().describe(
        "Company keyword for search mode (max 200 characters). Vendor " +
            'default "".',
    ),
    location: z.string().max(200).optional().describe(
        "Location filter for search mode (max 200 characters). Vendor " +
            'default "".',
    ),
    country: zIndeedCompanyCountry.optional().describe(
        'Indeed country code (56 countries). Vendor default "US".',
    ),
    maxItems: z.number().int().min(1).max(1000).optional().describe(
        "Maximum profiles attempted in search mode (1-1000, capped by your " +
            "plan). Vendor default 50.",
    ),
    companyKeys: z.array(z.string().min(1).max(500)).max(100).optional()
        .describe(
            "Lookup mode: Indeed company keys (the segment after /cmp/) or " +
                "exact HTTPS /cmp/<key> URLs, up to 100. A non-empty list " +
                "starts lookup mode and ignores keyword, location, and " +
                "maxItems.",
        ),
    fields: z.array(z.enum([
        "*",
        "key",
        "name",
        "industry",
        "sectors",
        "size",
        "sizeCode",
        "revenue",
        "revenueCode",
        "description",
        "founded",
        "stockSymbol",
        "tier",
        "claimed",
        "ceo",
        "ratings",
        "happiness",
        "urls",
        "logos",
        "brandColor",
        "headerVideoUrl",
        "headquarters",
        "addresses",
        "locations",
        "socialLinks",
        "parentEmployer",
        "totalJobCount",
        "similarCompanies",
        "meta",
    ])).min(1).optional().describe(
        "Top-level profile fields to return. Omit for the defaults. Use " +
            '["*"] alone for every field.',
    ),
}).strict();
