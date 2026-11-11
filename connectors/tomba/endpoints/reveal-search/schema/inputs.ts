import { z } from "zod";

/** POST /reveal/search body — the vendor mirror (docs.tomba.io
 *  api/reveal#search-companies, RevealSearchRequest / RevealFilters,
 *  2026-11-11). Send `query` or `filters`; bound as a union in
 *  endpoint.ts. */

/** `include` / `exclude` are nullable upstream: `meta.filters` returns
 *  `exclude: null`, and callers are told to send it back for the next
 *  pages. */
const zValues = (description: string) =>
    z.array(z.string()).max(50).nullable().describe(description).optional();

/** One include / exclude filter (SearchFilter / PremiumSearchFilter). */
const zFilter = (description: string) =>
    z.object({
        include: zValues(
            "Values to include — a company matches any of them.",
        ),
        exclude: zValues("Values to exclude."),
    }).strict().describe(description).optional();

export const zRevealFilters = z.object({
    company: zFilter("Company domains, such as 'stripe.com'."),
    location_country: zFilter(
        "Two-letter country codes (ISO 3166-1 alpha-2), such as 'US'.",
    ),
    location_city: zFilter("City names, such as 'San Francisco'."),
    location_state: zFilter("State or region names, such as 'California'."),
    industry: zFilter("Industries, such as 'financial services'."),
    size: zFilter(
        "Employee count ranges: '1-10', '11-50', '51-250', '251-1K', " +
            "'1K-5K', '5K-10K', or '10K-50K'.",
    ),
    type: zFilter(
        "Company types: 'privately held', 'public', 'partnership', " +
            "'nonprofit', 'education', 'government', 'self-owned', or " +
            "'self-employed'.",
    ),
    keywords: zFilter(
        "Keywords matched against each company's name, industry, " +
            "keywords, and description.",
    ),
    founded: zFilter(
        "Founding years, such as '2015', or ranges: 'before 1990', " +
            "'1990-1999', '2000-2009', '2010-2019', or '2020+'.",
    ),
    technologies: zFilter("Technology names, such as 'React'."),
    similar: zFilter(
        "Reference domains, such as 'stripe.com', to find similar companies.",
    ),
    revenue: zFilter(
        "Annual revenue ranges: '0-1m', '1m-10m', '10m-50m', '50m-100m', " +
            "'100m-250m', '250m-500m', '500m-1b', '1b-10b', or '10b+'.",
    ),
    sic: zFilter("Four-digit SIC codes, such as '7372'."),
    naics: zFilter("Six-digit NAICS codes, such as '522320'."),
}).strict();

export const zRevealSearchBody = z.object({
    query: z.string().min(8).max(100).describe(
        "Natural-language description of the companies you want, 8 to 100 " +
            "characters, such as 'Real estate agencies in Europe'. Filters " +
            "are generated from it (and returned in meta.filters); any " +
            "filters you send are ignored.",
    ).optional(),
    filters: zRevealFilters.describe(
        "Structured filters — a company must match all of them. Send the " +
            "meta.filters of a query response here to page without " +
            "regenerating them.",
    ).optional(),
    page: z.number().int().min(1).max(1000).describe(
        "Page number, 50 companies per page (default 1).",
    ).optional(),
}).strict();
