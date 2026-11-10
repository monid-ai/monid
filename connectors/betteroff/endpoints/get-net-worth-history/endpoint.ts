import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Get net worth history",
        summary: "Get net worth history",
        description:
            "Use this when the user asks how net worth changed over time. Read stored household valuations over time, paged by cursor. For a two-date explanation use betteroff_explain_net_worth_change. Requires BetterOff Core and networth:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/get_net_worth_history",
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
                    name: "betteroff_get_net_worth_history",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
