import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zV3MarketEquityCallBookQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Equity Call Book",
        summary:
            "Hourly long/short positioning of tracked equity callers, with crowding and pulse.",
        description:
            "How the accounts we follow are positioned in equities, hour " +
            "by hour. Same shape as elfa#v3/market/crypto/call-book: " +
            "`longShare` is how many of the counted accounts are long, " +
            "`crowdingPercentile` where that lean sits against this " +
            "book's own last 28 days, and the two pulse pairs how unusual " +
            "the last day and the last six hours are. History is sealed " +
            "hours; on a newest-first first page the top row is a live " +
            "tick, at most five minutes old.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/equity-call-book",
        categories: ["equities"],
        notes: [
            "2 credits for `limit` up to 50, 4 up to 200.",
        ],
    },
    request: { method: "GET", path: "/v3/market/equity/call-book" },
    input: {
        schema: {
            queryParams: zV3MarketEquityCallBookQueryParams.extend({
                limit: zV3MarketEquityCallBookQueryParams.shape.limit.unwrap()
                    .default(50),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                up_to_50: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "page of up to 50",
                    description: "one request with limit up to 50",
                    consumes: { credit: "default", amount: 2 },
                },
                up_to_200: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "page of up to 200",
                    description: "one request with limit 51 to 200",
                    consumes: { credit: "default", amount: 4 },
                },
            },
        },
        estimate: ({ data }) => {
            const query = data.input.queryParams;
            const limit = query?.limit ?? 0;
            return {
                counts: {
                    up_to_50: limit <= 50 ? 1 : 0,
                    up_to_200: limit > 50 ? 1 : 0,
                },
            };
        },
        evidence: ({ data }) => {
            const query = data.input.queryParams;
            const limit = query?.limit ?? 0;
            return {
                counts: {
                    up_to_50: limit <= 50 ? 1 : 0,
                    up_to_200: limit > 50 ? 1 : 0,
                },
            };
        },
    },
});
