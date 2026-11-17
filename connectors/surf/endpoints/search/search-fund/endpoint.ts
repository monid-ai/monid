import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchFundQueryParams } from "./schema/inputs.ts";

/**
 * GET /search/fund — Light tier, 1 Surf credit per call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Fund Search",
        summary: "Searches funds by keyword.",
        description: "Searches crypto VC funds by name (e.g. a16z, paradigm, " +
            "coinbase ventures; 2-100 characters) and returns paginated " +
            "matches with name, tier, type, logo and top invested projects " +
            "(limit up to 100, default 20; offset). For a fund's full " +
            "profile and team use /fund/detail, which also accepts a name " +
            "via q; for its list of investments use /fund/portfolio; for " +
            "funds ranked against each other use /fund/ranking. For crypto " +
            "projects rather than funds, use /search/project.",
        docsUrl: "https://docs.asksurf.ai/data-api/search/fund",
        categories: ["company-enrichment", "funding-data"],
        notes: [
            "The exact credit tier for this endpoint is not individually " +
            "verified - confirm against your billing before relying on " +
            "the rate.",
        ],
    },
    request: { method: "GET", path: "/search/fund" },
    input: {
        schema: {
            // vendor defaults at the binding (D25); the mirror stays optional-only
            queryParams: zSearchFundQueryParams.extend({
                limit: zSearchFundQueryParams.shape.limit.unwrap().default(20),
                offset: zSearchFundQueryParams.shape.offset.unwrap().default(0),
            }),
        },
    },
    usage: {
        // Surf's published Light tier — v1 makePerCallPrice(surfCredits(1)),
        // the balance-differencing drills of 2026-08 (design D1)
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
