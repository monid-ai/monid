import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Get defi positions",
        summary: "Get defi positions",
        description:
            "Use this when the user asks about DeFi, lending, staking, or LP positions, or protocol exposure. DeFi exposure by protocol across chains: total value, position count, per-asset breakdown. Requires BetterOff Core and investments:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/get_defi_positions",
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
                    name: "betteroff_get_defi_positions",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
