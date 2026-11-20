import { defineEndpoint } from "@shared/core";
import { zGetProductBody } from "./schema/inputs.ts";

/** get_product — `tools/call` on Loyaltie's MCP server. */
export default defineEndpoint({
    meta: {
        displayName: "Loyaltie Get Product",
        summary:
            "Full details of one product: price, variants, photos, ratings, ingredients, shipping and regular delivery.",
        description: "Everything about one Loyaltie product, by id or " +
            "product URL from a search: title and full description, " +
            "variants with price (cents, USD) and availability, photos, " +
            "rating with its scale and review count, ingredients and " +
            "attributes (organic, vegan, gluten-free and so on), where it " +
            "ships from, processing time, the regular-delivery offer " +
            "(frequencies and discount), the brand, and disclosure " +
            "messages that must be shown to the person word for word. " +
            "Next: loyaltie#build-cart-link. Free.",
        docsUrl: "https://loyaltie.com/skill.md",
        categories: ["shopping"],
    },
    endpoint: "/get-product",
    request: { method: "POST", path: "/api/ucp/mcp" },
    input: {
        schema: { body: zGetProductBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "get_product",
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
