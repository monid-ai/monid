import { defineEndpoint } from "@shared/core";
import { zGetVenueBody } from "./schema/inputs.ts";

/** Dim Hour MCP tool `get_venue`, as the stable public endpoint
 *  `dimhour#get-venue`. The wire call is the provider's shared
 *  `POST /mcp`; toRequest wraps the validated input as the JSON-RPC
 *  `params.arguments` under the fixed tool name. */
export default defineEndpoint({
    meta: {
        displayName: "Get Venue",
        summary: "Read one venue's full Dim Hour record.",
        description:
            "Get one venue's full Dim Hour record: description, signature dishes, address, hours, phone, happy hour, reservation platform, awards, website and Instagram, plus the long-form story for Iconic 50 venues. `city` is required; identify the venue by `id` from a search, or by `name`.",
    },
    endpoint: "/get-venue",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zGetVenueBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name: "get_venue", arguments: data.input.body ?? {} },
            },
        }),
    },
});
