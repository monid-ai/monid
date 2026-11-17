import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Explain net worth change",
        summary: "Explain net worth change",
        description:
            "Use this when the user asks what caused net worth to change between two dates. Reconcile two stored net-worth valuations using asset and liability changes. Requires BetterOff Core and networth:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/explain_net_worth_change",
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
                    name: "betteroff_explain_net_worth_change",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
