import { defineEndpoint } from "@shared/core";
import { zSearchCatalogBody } from "./schema/inputs.ts";

/** search_catalog — `tools/call` on Loyaltie's MCP server. */
export default defineEndpoint({
    meta: {
        displayName: "Loyaltie Search Catalog",
        summary:
            "Search everyday products from independent US brands, with price, state and regular-delivery filters.",
        description: "Search Loyaltie's catalog of everyday products " +
            "(coffee and tea, pantry, snacks, drinks, skin and body care, " +
            "home care, pet food) from independent US brands. Put the " +
            "product words in catalog.query, short ('pasta', not 'healthy " +
            "pasta'), the person's task in context.intent, and hard " +
            "requirements in filters: price in cents, regular_delivery, " +
            "and ships_from (the brand's US state). Each product returns " +
            "title, description, price (cents, USD), photos, rating, the " +
            "brand with its city and state, regular-delivery options, a " +
            "product url and a one-item checkout_url. Read the messages " +
            "array: allergen and safety disclosures must be shown to the " +
            "person. Next: loyaltie#get-product for detail, " +
            "loyaltie#build-cart-link to buy. Free.",
        docsUrl: "https://loyaltie.com/skill.md",
        categories: ["shopping"],
    },
    endpoint: "/search-catalog",
    request: { method: "POST", path: "/api/ucp/mcp" },
    input: {
        schema: { body: zSearchCatalogBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "search_catalog",
                    arguments: {
                        ...(data.input.body as Record<string, never>),
                        src: "api",
                        agent_id: "monid",
                    },
                },
            },
        }),
    },
});
