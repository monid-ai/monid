import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Get account flows",
        summary: "Get account flows",
        description:
            "Use this when the user asks how much entered or left specific accounts. Gross inflows, gross outflows, and net flow for selected accounts over a date range, aggregated over ALL matches server-side, e.g. 'how much did I deposit into Schwab this year'. Prefer this over betteroff_search_transactions for deposit/withdrawal totals. Requires BetterOff Core and accounts:read, transactions:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/get_account_flows",
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
                    name: "betteroff_get_account_flows",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
