import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zHomedepotProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `homedepot/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Home Depot Products",
        summary: "Get a Home Depot product's title, price, regular price, " +
            "store stock and nearest store by product URL and zip code.",
        description:
            "Get a Home Depot product's title, price, regular price, " +
            "store stock and nearest store by product URL and zip code. " +
            "Returns one row per product with itemId, title, productUrl, " +
            "price, listPrice, bulkPrice, currency, storeQuantity, store, " +
            "mainImage, description. $0.0145 per product; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/homedepot/products",
        categories: ["homedepot", "ecommerce"],
    },
    endpoint: "/homedepot/products",
    request: { method: "POST", path: "/v1/data/homedepot/products/run" },
    input: {
        schema: {
            body: zHomedepotProductsBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0145 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.url.split("\n").filter((line: string) =>
                line.trim() !== ""
            ).length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
