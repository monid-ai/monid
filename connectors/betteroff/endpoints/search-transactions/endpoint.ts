import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Search transactions",
        summary: "Search transactions",
        description:
            "Use this when the user asks to find transactions or total a filtered set of transactions. Search transactions by date, merchant, category, trait, type/class, account, or amount; a summary totals all matches. Brokerage deposits/withdrawals: transactionClass `brokerage`, transactionTypes `transfer_in`/`transfer_out`/`deposit`/`withdrawal`. Requires BetterOff Core and transactions:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/search_transactions",
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
                    name: "betteroff_search_transactions",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
