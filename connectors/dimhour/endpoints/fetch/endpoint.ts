import { defineEndpoint } from "@shared/core";
import { zFetchBody } from "./schema/inputs.ts";

/** Dim Hour MCP tool `fetch`, as the stable public endpoint
 *  `dimhour#fetch`. The wire call is the provider's shared
 *  `POST /mcp`; toRequest wraps the validated input as the JSON-RPC
 *  `params.arguments` under the fixed tool name. */
export default defineEndpoint({
    meta: {
        displayName: "Fetch",
        summary: "Fetch one venue by the city:id identifier Search returns.",
        description:
            "Fetch one Dim Hour venue by the `city:id` identifier Search returns (for example 'nyc:1367'): description, signature dishes, address, hours, phone, happy hour, reservation platform, awards, website and Instagram, with its citable URL. The OpenAI connector-compatible pair with Search.",
    },
    endpoint: "/fetch",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zFetchBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name: "fetch", arguments: data.input.body ?? {} },
            },
        }),
    },
});
