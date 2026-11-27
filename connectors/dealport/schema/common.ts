import { z } from "zod";

/** Dealport company UUID format across `/api/v1/*` request schemas. */
export const zDealportUuid = z.string().regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
);

/** Two-letter US state or territory code (e.g. "OH", "TX", "FL"). */
export const zUsStateCode = z.string().regex(/^[A-Za-z]{2}$/);

/**
 * Shared scalar buy-box filter validators mirrored from Dealport's OpenAPI 3.1
 * `CompanyFilterBody` and `GET /api/v1/companies` parameters. Descriptions and
 * single-field bounds live here; `search-companies` wraps them in `.optional()`
 * while `preview-companies` wraps nullable JSON body fields in
 * `.nullable().optional()`.
 */
export const companyFilterFields = {
    q: z.string().min(1).describe(
        "Company name prefix filter.",
    ),
    state: zUsStateCode.describe(
        "Two-letter US state code (e.g. 'OH', 'TX', 'FL').",
    ),
    domain: z.string().min(1).describe(
        "Company website host or registrable domain (e.g. 'acme.com').",
    ),
    min_revenue: z.number().min(0).describe(
        "Minimum annual revenue in US dollars.",
    ),
    max_revenue: z.number().min(0).describe(
        "Maximum annual revenue in US dollars.",
    ),
    filed_revenue_only: z.boolean().describe(
        "Restrict to primary filed revenue from CMS cost reports or PPP filings.",
    ),
    min_employees: z.number().int().min(0).describe(
        "Minimum employee headcount.",
    ),
    max_employees: z.number().int().min(0).describe(
        "Maximum employee headcount.",
    ),
    size_unknown: z.boolean().describe(
        "Include companies without reported headcount or revenue alongside sized matches.",
    ),
    independent: z.boolean().describe(
        "Exclude SEC filers, nonprofits, government bodies, membership groups, and HOAs.",
    ),
    owner_businesses: z.number().int().min(2).max(25).describe(
        "Minimum number of businesses associated with the same owner (2 to 25).",
    ),
    medicare: z.boolean().describe(
        "Require Medicare enrollment with a CMS certification number.",
    ),
    owner_operated: z.boolean().describe(
        "Require owner-operated status in CMS filings.",
    ),
    owner_contact: z.boolean().describe(
        "Require an owner phone or email already on file.",
    ),
    licensed: z.boolean().describe(
        "Require an active state health license.",
    ),
    adviser: z.boolean().describe(
        "Require SEC Form ADV investment adviser registration.",
    ),
    wealth_adviser: z.boolean().describe(
        "Require individual wealth adviser profile (no private funds, at least 20 clients).",
    ),
    online_store: z.boolean().describe(
        "Require an indexed online storefront.",
    ),
    min_reviews: z.number().int().min(0).describe(
        "Minimum online store review count.",
    ),
    order: z.enum(["reviews", "products", "match"]).describe(
        "Storefront sort order.",
    ),
    limit: z.number().int().min(1).max(50).describe(
        "Page size (1 to 50, default 25).",
    ),
};

/**
 * Shared OpenAPI `OwnerLookupRequest` shape used by `POST /api/v1/owners`
 * and `POST /api/v1/contacts`.
 */
export const ownerLookupShape = {
    company_id: zDealportUuid.describe(
        "Dealport company UUID from company search, preview, or list matching.",
    ),
    person: z.string().min(1).describe(
        "Optional full name of a specific principal listed on the company Record.",
    ).nullable().optional(),
};
