import { defineEndpoint } from "@shared/core";
import { zGetHoursBody } from "./schema/inputs.ts";

/** Dim Hour MCP tool `get_hours`, as the stable public endpoint
 *  `dimhour#get-hours`. The wire call is the provider's shared
 *  `POST /mcp`; toRequest wraps the validated input as the JSON-RPC
 *  `params.arguments` under the fixed tool name. */
export default defineEndpoint({
    meta: {
        displayName: "Get Hours",
        summary:
            "One venue's opening hours from the catalog, with an as-of date.",
        description:
            "Get one venue's opening hours from the Dim Hour catalog, with a receipt saying how old they are. Hours are best-effort catalog data, not a live feed: check with the venue directly before relying on them. When a venue has no hours on file this abstains and says so rather than guessing.",
        notes: [
            "Hours are best-effort catalog data and can be out of date: confirm with the venue before relying on them.",
        ],
    },
    endpoint: "/get-hours",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zGetHoursBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name: "get_hours", arguments: data.input.body ?? {} },
            },
        }),
    },
});
