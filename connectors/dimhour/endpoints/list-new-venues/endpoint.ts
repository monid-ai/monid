import { defineEndpoint } from "@shared/core";
import { zListNewVenuesBody } from "./schema/inputs.ts";

/** Dim Hour MCP tool `list_new_venues`, as the stable public endpoint
 *  `dimhour#list-new-venues`. The wire call is the provider's shared
 *  `POST /mcp`; toRequest wraps the validated input as the JSON-RPC
 *  `params.arguments` under the fixed tool name. */
export default defineEndpoint({
    meta: {
        displayName: "List New Venues",
        summary: "Venues recently added to Dim Hour, in one city or all.",
        description:
            'List venues recently added to the Dim Hour catalog, in one city or across all of them, for "what is new" answers and opening digests. Places to eat and drink come first; hotels, museums and landmarks follow. Newest first within each group. Carries a freshness receipt.',
        notes: [
            "Addition dates earlier than 2026-06-06 are estimates Dim Hour reconstructed from its history.",
        ],
    },
    endpoint: "/list-new-venues",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zListNewVenuesBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "list_new_venues",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
