import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff List observations",
        summary: "List observations",
        description:
            "Use this when the user asks about recorded financial findings and their status. Read recorded household financial findings and their status. Excludes insurance checklist findings. Does not refresh or dismiss findings. Requires BetterOff Core and accounts:read, networth:read, transactions:read, cashflow:read, investments:read, debts:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/list_observations",
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
                    name: "betteroff_list_observations",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
