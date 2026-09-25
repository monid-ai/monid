import { defineEndpoint } from "@shared/core";
import { zSearchVenuesBody } from "./schema/inputs.ts";

/** Dim Hour MCP tool `search_venues`, as the stable public endpoint
 *  `dimhour#search-venues`. The wire call is the provider's shared
 *  `POST /mcp`; toRequest wraps the validated input as the JSON-RPC
 *  `params.arguments` under the fixed tool name. */
export default defineEndpoint({
    meta: {
        displayName: "Search Venues",
        summary:
            "Search Dim Hour venues in one city or every city, with filters.",
        description:
            "Search the Dim Hour catalog for restaurants, bars and venues. Pass `city` to search one city, or omit it to search every city at once. The free-text `query` matches each content word on its own across name, cuisine, neighborhood, tags, dishes and description, so one strong keyword beats a sentence. Filters cover neighborhood, cuisine, price tier, awards, happy hour, trending and Iconic 50. Returns ranked matches with cuisine, neighborhood, price tier, happy-hour info and a dimhour.com link for each venue.",
        notes: ["`limit` is capped at 25 by Dim Hour; omit it for 10."],
    },
    endpoint: "/search-venues",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zSearchVenuesBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "search_venues",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
