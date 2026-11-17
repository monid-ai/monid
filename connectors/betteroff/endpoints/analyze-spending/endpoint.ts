import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Analyze spending",
        summary: "Analyze spending",
        description:
            "Use this when the user asks where money went or compares spending across periods. Read category or merchant spending for a period, optionally against an earlier one. Excludes transfers and loan payments; fees and interest count. Requires BetterOff Core and transactions:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/analyze_spending",
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
                    name: "betteroff_analyze_spending",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
