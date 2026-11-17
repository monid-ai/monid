import { defineEndpoint } from "@shared/core";
import { zAsinSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /search — Search an Amazon store for products.
 *
 * Billing: Free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Asin Amazon Search",
        summary: "Search an Amazon store for products.",
        description:
            "Search an Amazon store for keywords and get the products: ASIN, " +
            "title, image, price and currency, rating and review count.",
        docsUrl: "https://www.asin.dev/developers",
        categories: ["amazon"],
        notes: ["Free."],
    },
    request: { method: "GET", path: "/search" },
    input: { schema: { queryParams: zAsinSearchQueryParams } },
});
