import { z } from "zod";

/**
 * GET /v1/search query parameters — OpenAPI `searchCompanies`
 * (https://companyregistryapi.com/api/openapi.json, read 2026-11-07),
 * components Query, AddressCountry, Jurisdiction, Limit and Cursor.
 * Faithful mirror (D25): the published bounds and patterns, optionality
 * only, no `.default()` — the vendor's `limit` default of 10 is not a
 * billing knob (the provider is FREE), so it stays in the describe.
 */
export const zCompanyRegistrySearchQueryParams = z.strictObject({
    q: z.string().min(3).max(64).describe(
        "The start of a company name or a business ID, 3 to 64 " +
            "characters once whitespace is collapsed. Search for the " +
            "start of a name, never a description.",
    ),
    address_country: z.string().regex(/^([A-Za-z]{2}|[Aa][Ll][Ll])$/)
        .describe(
            "ISO 3166-1 alpha-2 address country, such as FI, in either " +
                "case, matched against country_code. Omit it or pass all " +
                "for every country.",
        ).optional(),
    jurisdiction: z.string()
        .regex(/^([A-Za-z]{2}(-[A-Za-z0-9]{1,3})?|[Aa][Ll][Ll])$/)
        .describe(
            "Registration jurisdiction, ISO 3166-1 alpha-2 or ISO 3166-2 " +
                "such as CA or CA-QC, matched against the registry " +
                "identifiers; a country code also matches its " +
                "subdivisions. Omit or pass all for every jurisdiction.",
        ).optional(),
    limit: z.number().int().min(1).max(25).describe(
        "Results per page, 1 to 25; 10 when omitted.",
    ).optional(),
    cursor: z.string().describe(
        "The previous page's next_cursor, sent with the same q, filters " +
            "and limit. Cursors expire in about 15 minutes; on 400 start " +
            "again from the first page.",
    ).optional(),
});
