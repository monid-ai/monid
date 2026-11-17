import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zOnchainYieldRankingQueryParams } from "./schema/inputs.ts";

/**
 * GET /onchain/yield/ranking — Standard tier, 2 Surf credits per call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Yield Pool Ranking",
        summary: "List individual DeFi yield pools ranked by APY or TVL.",
        description: "Lists individual DeFi yield pools ranked by APY " +
            "(default) or TVL in USD, descending by default, paginated " +
            "(limit up to 100, default 20; offset). Filter to one protocol " +
            "by name (project, e.g. lido, aave, uniswap). When ranked by APY " +
            "only pools with at least $100k TVL are included. This is " +
            "pool-level data; for a protocol leaderboard by TVL, fees or " +
            "revenue use /project/defi/ranking, and for one protocol's " +
            "metrics use /project/defi/metrics.",
        docsUrl: "https://docs.asksurf.ai/data-api/onchain/yield-ranking",
        categories: ["yields"],
    },
    request: { method: "GET", path: "/onchain/yield/ranking" },
    input: {
        schema: {
            // vendor defaults at the binding (D25); the mirror stays optional-only
            queryParams: zOnchainYieldRankingQueryParams.extend({
                sort_by: zOnchainYieldRankingQueryParams.shape.sort_by.unwrap()
                    .default("apy"),
                order: zOnchainYieldRankingQueryParams.shape.order.unwrap()
                    .default("desc"),
                limit: zOnchainYieldRankingQueryParams.shape.limit.unwrap()
                    .default(20),
                offset: zOnchainYieldRankingQueryParams.shape.offset.unwrap()
                    .default(0),
            }),
        },
    },
    usage: {
        // Surf's published Standard tier — v1 makePerCallPrice(surfCredits(2)),
        // the balance-differencing drills of 2026-08 (design D1)
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
