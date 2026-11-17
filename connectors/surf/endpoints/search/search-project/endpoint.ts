import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchProjectQueryParams } from "./schema/inputs.ts";

/**
 * GET /search/project — Light tier, 1 Surf credit per call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Project Search",
        summary: "Searches crypto projects by keyword.",
        description: "Searches crypto projects by name or ticker (e.g. " +
            "uniswap, bitcoin, ETH; 2-100 characters) and returns paginated " +
            "matches with name, description, chains and logo (limit up to " +
            "100, default 20; offset). Use it to see which projects match a " +
            "keyword. You often do not need it first: /project/detail, " +
            "/market/tge and /market/public-sale accept a project name " +
            "directly via q. For a token's contract address use " +
            "/search/token; for VC funds use /search/fund.",
        docsUrl: "https://docs.asksurf.ai/data-api/search/project",
        categories: ["company-enrichment"],
        notes: [
            "The exact credit tier for this endpoint is not individually " +
            "verified - confirm against your billing before relying on " +
            "the rate.",
        ],
    },
    request: { method: "GET", path: "/search/project" },
    input: {
        schema: {
            // vendor defaults at the binding (D25); the mirror stays optional-only
            queryParams: zSearchProjectQueryParams.extend({
                limit: zSearchProjectQueryParams.shape.limit.unwrap().default(
                    20,
                ),
                offset: zSearchProjectQueryParams.shape.offset.unwrap().default(
                    0,
                ),
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
