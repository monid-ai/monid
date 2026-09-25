import { defineEndpoint } from "@shared/core";

/** Dim Hour MCP tool `list_cities`, as the stable public endpoint
 *  `dimhour#list-cities`. The wire call is the provider's shared
 *  `POST /mcp`; toRequest wraps the validated input as the JSON-RPC
 *  `params.arguments` under the fixed tool name. */
export default defineEndpoint({
    meta: {
        displayName: "List Cities",
        summary: "List the cities Dim Hour covers and the key each one takes.",
        description:
            "List the cities Dim Hour covers, with the city key every other Dim Hour endpoint takes. A region (New Mexico) is listed with its child cities. Takes no input. Call it first when the caller names a city in their own words.",
    },
    endpoint: "/list-cities",
    request: { method: "POST", path: "/mcp" },
    input: {
        toRequest: () => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name: "list_cities", arguments: {} },
            },
        }),
    },
});
