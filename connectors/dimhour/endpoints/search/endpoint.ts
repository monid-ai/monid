import { defineEndpoint } from "@shared/core";
import { zSearchBody } from "./schema/inputs.ts";

/** Dim Hour MCP tool `search`, as the stable public endpoint
 *  `dimhour#search`. The wire call is the provider's shared
 *  `POST /mcp`; toRequest wraps the validated input as the JSON-RPC
 *  `params.arguments` under the fixed tool name. */
export default defineEndpoint({
    meta: {
        displayName: "Search",
        summary: "Natural-language search across every Dim Hour city.",
        description:
            "Search the whole Dim Hour catalog with one natural-language query, for example 'ramen dallas' or 'rooftop bar miami'. Returns ranked venues, each with a `city:id` identifier and a citable dimhour.com URL. The OpenAI connector-compatible pair with Fetch.",
    },
    endpoint: "/search",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zSearchBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name: "search", arguments: data.input.body ?? {} },
            },
        }),
    },
});
