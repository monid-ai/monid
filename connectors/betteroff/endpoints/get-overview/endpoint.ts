import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Get overview",
        summary: "Get overview",
        description:
            "Use this when the user asks for a household financial overview or data coverage. Get a compact household picture: latest stored valuation, account coverage, canonical ledger review counts, and the masked login and household name. No provider refresh. Requires BetterOff Core and accounts:read, networth:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/get_overview",
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
                    name: "betteroff_get_overview",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
