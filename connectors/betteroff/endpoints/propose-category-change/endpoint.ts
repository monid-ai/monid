import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Propose category change",
        summary: "Propose category change",
        description:
            "Use this when the user asks to correct the category of selected transactions. Prepare a durable category correction for selected transaction IDs. This saves a pending proposal and changes no financial records. The user must open the authenticated review link and explicitly choose selected payments or matching and future payments. Never report a proposal as applied. Requires BetterOff Core and transactions:read, corrections:prepare in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
            "This tool writes state. Call only when requested or approved by the user. A prepared proposal or action is not an applied correction or completed transfer.",
            "No automatic retries. Reuse the original idempotency key for a user-authorized retry of the same request where supported.",
        ],
    },
    endpoint: "/propose_category_change",
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
                    name: "betteroff_propose_category_change",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
