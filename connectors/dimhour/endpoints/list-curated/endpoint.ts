import { defineEndpoint } from "@shared/core";
import { zListCuratedBody } from "./schema/inputs.ts";

/** Dim Hour MCP tool `list_curated`, as the stable public endpoint
 *  `dimhour#list-curated`. The wire call is the provider's shared
 *  `POST /mcp`; toRequest wraps the validated input as the JSON-RPC
 *  `params.arguments` under the fixed tool name. */
export default defineEndpoint({
    meta: {
        displayName: "List Curated Lists",
        summary: "Dim Hour's editorial themed lists for a city.",
        description:
            "Read Dim Hour's editorial themed lists for a city (for example speakeasies). Without `list_id` it returns every list for the city; with `list_id` it returns that list's venues with editorial notes.",
    },
    endpoint: "/list-curated",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zListCuratedBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "list_curated",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
