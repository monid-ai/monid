import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Get vault yields",
        summary: "Get vault yields",
        description:
            "Use this when the user asks for current APYs of the vaults Investing lists. List reported APYs for the Morpho vaults the user can deposit into from BetterOff Investing: USDC and USDT on Ethereum, USDC on Base, and pathUSD on Tempo. Each row has the protocol's source and date. Filter by venue or asset symbol. Returns at most 50 vaults in name order. Requires BetterOff Core and investments:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/get_vault_yields",
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
                    name: "betteroff_get_vault_yields",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
