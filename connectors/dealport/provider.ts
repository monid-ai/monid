import { defineProvider, presets } from "@shared/core";

/**
 * Dealport (dealport.com): the SMB knowledge layer for agents and humans,
 * covering 28M+ US private companies, the commercial and multifamily buildings
 * they own, and the verified human principals behind them, backed by primary
 * public-filing citations.
 *
 * Nine synchronous JSON endpoints under `https://app.dealport.com/api/v1/*`
 * authenticated via `Authorization: Bearer <apiKey>`.
 *
 * RATE CARD: published in Dealport's OpenAPI 3.1 specification
 * (https://app.dealport.com/openapi/v1.json, checked 2026-11-27). Dealport
 * prices every API action in plain US dollars (`default` pool = US dollars):
 *   - POST /api/v1/companies/preview   $0.00 (FREE)
 *   - POST /api/v1/companies/match     $0.00 (FREE)
 *   - GET  /api/v1/companies           $0.01 per new company Record returned
 *   - GET  /api/v1/buildings           $0.01 per new building Record returned
 *   - GET  /api/v1/records/{id}        $0.01 per new Record ($0.00 30d repeat)
 *   - POST /api/v1/pages               $0.01 per live fetch ($0.00 cached)
 *   - POST /api/v1/owners              $0.09 per verified hit ($0.00 miss)
 *   - POST /api/v1/contacts            $0.09 per verified hit ($0.00 miss)
 *   - POST /api/v1/buildings/owners    $0.05 per NYC building owner ($0.00 quote)
 *
 * Every response carries Dealport's own billing receipt (`cost_usd` on V4
 * envelopes, or cent-denominated `credits_charged` on search pages, alongside
 * `remaining_balance_usd`). Provider-level `usage.consolidate` plucks those
 * receipt fields out of the payload and claims the reported US dollar total.
 */
export default defineProvider({
    name: "dealport",
    meta: {
        displayName: "Dealport",
        summary:
            "US private company, commercial building, and verified human owner intelligence with primary filing citations.",
        description:
            "Dealport is the SMB knowledge layer for agents and humans: 28M+ " +
            "US private operating companies, NYC commercial and multifamily " +
            "buildings, and the verified human principals behind them, with " +
            "primary public-filing citations across corporate registries, UCC " +
            "filings, Medicare and CMS cost reports, state licenses, SEC Form " +
            "ADV, and municipal property and mortgage filings. Size markets " +
            "and match company lists for $0.00, open cited company and " +
            "building Records, read clean website Markdown, and resolve " +
            "verified owner mobile phones, direct lines, emails, and career " +
            "profiles.",
        homepageUrl: "https://dealport.com",
        docsUrl: "https://dealport.com/docs",
        categories: [
            "company-enrichment",
            "people-enrichment",
            "real-estate",
        ],
        notes: [
            "Repeat reads of the same Record or verified owner contact within " +
            "30 days in the same workspace settle at $0.00.",
            "API keys enforce capability scopes (`read` for previews, " +
            "searches, Records, list matching, and pages; `owners` for " +
            "company owner and contact lookups; `watch` for NYC building " +
            "owner research). An unscoped key answers 403 " +
            "`insufficient_key_scope` with zero charge.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://app.dealport.com" },
    timeouts: { requestMs: 60_000, runMs: 65_000 },
    usage: {
        credits: {
            default: {
                label: "US dollars",
                description:
                    "Pay-as-you-go US dollar charges reported by Dealport",
            },
        },
        consolidate: ({ data, utils }) => {
            const p1 = utils.json.pluck(data.output, "$.cost_usd");
            const p2 = utils.json.pluck(p1.rest, "$.credits_charged");
            const p3 = utils.json.pluck(p2.rest, "$.remaining_balance_usd");
            const p4 = utils.json.pluck(p3.rest, "$.data.cost_usd");
            const p5 = utils.json.pluck(p4.rest, "$.data.credits_charged");
            const p6 = utils.json.pluck(
                p5.rest,
                "$.data.remaining_balance_usd",
            );
            const usd = typeof p1.value === "number"
                ? p1.value
                : typeof p4.value === "number"
                ? p4.value
                : typeof p2.value === "number"
                ? p2.value / 100
                : typeof p5.value === "number"
                ? p5.value / 100
                : undefined;
            return {
                credits: {
                    ...(usd !== undefined ? { default: usd } : {}),
                },
                output: p6.rest,
            };
        },
    },
});
