import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Search markets",
        summary: "Search markets",
        description:
            "Use this when the user asks to find public FX reference rates, Hyperliquid spot or perpetual markets, or prediction outcomes. Search public FX reference rates (USD base), Hyperliquid spot/perpetual markets, and prediction markets. Filter by kind or source to narrow coverage. Returns at most 50 dated observations per page, busiest first by 24-hour USD volume where reported. For the next page, pass page.nextCursor as cursor with the same query, kind, source, and limit. Requires BetterOff Core and investments:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/search_markets",
    request: { method: "POST", path: "/mcp" },
    output: { schema: zOutput },
    input: {
        schema: { body: zBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "betteroff_search_markets",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
