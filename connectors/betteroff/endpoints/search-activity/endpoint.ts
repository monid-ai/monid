import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Search activity",
        summary: "Search activity",
        description:
            "Use this when the user asks about recorded account changes or correction proposals. Read permitted record changes. For an account's correction proposals (pending or approved), set accountId (via betteroff_list_accounts), actorType=all, action=null; needs corrections:prepare. Omits security events and raw fields. Requires BetterOff Core and activity:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/search_activity",
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
                    name: "betteroff_search_activity",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
