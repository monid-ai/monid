import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Request vault deposit",
        summary: "Request vault deposit",
        description:
            "Use this when the user asks to deposit USDC, USDT, or pathUSD from one of their own wallets into a vault they chose from Investing. Request a USDC, USDT, or pathUSD deposit from one of the household's tracked EVM wallets into a Morpho vault on Ethereum, Base, or Tempo listed by betteroff_get_vault_yields. Saves a request for the user to review; never approves, signs, or deposits. Only prepare a deposit the user asked for, into a vault the user named; never pick a vault for them. Return the review link and say it awaits the user's approval and wallet signature. Requires BetterOff Core and investments:read, transfers:vault in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
            "This tool writes state. Call only when requested or approved by the user. A prepared proposal or action is not an applied correction or completed transfer.",
            "No automatic retries. Reuse the original idempotency key for a user-authorized retry of the same request where supported.",
            "Return the authenticated review link. Never approve, sign, or execute an action through this connector. Transfer scopes require the generic MCP resource, not the ChatGPT resource.",
        ],
    },
    endpoint: "/request_vault_deposit",
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
                    name: "betteroff_request_vault_deposit",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
