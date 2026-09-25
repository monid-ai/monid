import { defineEndpoint } from "@shared/core";
import { zFindPlacesBody } from "./schema/inputs.ts";

/** Dim Hour MCP tool `find_places`, as the stable public endpoint
 *  `dimhour#find-places`. The wire call is the provider's shared
 *  `POST /mcp`; toRequest wraps the validated input as the JSON-RPC
 *  `params.arguments` under the fixed tool name. */
export default defineEndpoint({
    meta: {
        displayName: "Find Places",
        summary: "Find venues for a specific occasion in one city.",
        description:
            "Find places for a specific occasion in one city. Give the city and what the occasion needs (a cuisine, a vibe, a neighborhood, a budget) and it returns ranked venues with dimhour.com links and a freshness receipt. Use it when planning an outing; use Search Venues when browsing.",
    },
    endpoint: "/find-places",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zFindPlacesBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "find_places",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
