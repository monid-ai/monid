import { z } from "zod";

/**
 * Shared fragments for the Bloomberry endpoint schemas. Bloomberry spells
 * every multi-value filter as ONE semicolon-separated query value
 * (`company_country=US;GB`); the schemas carry them as ARRAYS and the
 * provider-level `input.toRequest` joins them before the wire.
 */

export const zDomain = z.string().min(1).describe(
    "Company website domain, bare (e.g. 'unifygtm.com' — no scheme, no path).",
);

// z.iso.date() compiles to a calendar-aware pattern (month/day bounds, leap
// years) — real validation survives into the compiled doc.
export const zDate = z.iso.date().describe("Date formatted as YYYY-MM-DD.");

export const zEmployeeSizeRange = z.enum([
    "1 employee",
    "2-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1,000",
    "1,001-5,000",
    "5,001-10,000",
    "10,001+",
]);

export const zRegion = z.enum([
    "Africa",
    "Asia",
    "Europe",
    "North America",
    "Oceania",
    "South America",
]);

/** ISO 3166-1 alpha-2 headquarters country code. */
export const zCountryCode = z.string().regex(/^[A-Z]{2}$/).describe(
    "ISO 3166-1 alpha-2 country code (e.g. 'US').",
);

/** The company-side filters shared by the two list endpoints
 *  (`/signals/tech.json`, `/accounts/tech.json`). */
export const zCompanyFilters = z.object({
    company_employee_size_range: z.array(zEmployeeSizeRange).optional()
        .describe(
            "Filter by company headcount band(s). Semicolon-separated on " +
                "the wire.",
        ),
    company_industry: z.array(z.string().min(1)).optional().describe(
        "Filter by LinkedIn industry name(s), e.g. 'Software Development'. " +
            "Valid values: https://api.revealera.com/linkedin_industries.txt. " +
            "Semicolon-separated on the wire.",
    ),
    company_country: z.array(zCountryCode).optional().describe(
        "Filter by headquarters country, ISO 3166-1 alpha-2 (e.g. ['US', " +
            "'GB']). Semicolon-separated on the wire.",
    ),
    company_region: z.array(zRegion).optional().describe(
        "Filter by headquarters region. Semicolon-separated on the wire.",
    ),
    exclude_domains: z.array(zDomain).optional().describe(
        "Company domains to leave out of the results. Semicolon-separated " +
            "on the wire.",
    ),
    omit_linkedin_data: z.boolean().optional().describe(
        "true removes the LinkedIn-derived fields (linkedin_username, " +
            "linkedin_company_id) from each row, e.g. for compliance.",
    ),
});

/** Cursor pagination shared by the two list endpoints: pass the previous
 *  response's `pagination.next_token` to fetch the next page. */
export const zCursor = z.object({
    limit: z.number().int().min(1).max(20).optional().describe(
        "Rows per page, 1-20. Default 20.",
    ),
    next_token: z.string().min(1).optional().describe(
        "Cursor from `pagination.next_token` in the previous response. " +
            "Omit for the first page.",
    ),
});
