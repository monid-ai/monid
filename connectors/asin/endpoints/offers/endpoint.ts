import { defineEndpoint } from "@shared/core";
import { zAsinOffersQueryParams } from "./schema/inputs.ts";

/**
 * GET /offers — Read the offers Asin has already collected for a product.
 *
 * Billing: Free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Asin Product Offers",
        summary: "Read the offers Asin has already collected for a product.",
        description:
            "Read the offers Asin has already collected for an ASIN: Amazon's " +
            "own price, the lowest new and used prices, and each seller's " +
            "offer. Empty when Asin has not checked the product yet.",
        docsUrl: "https://www.asin.dev/developers",
        categories: ["amazon"],
        notes: ["Free."],
    },
    request: { method: "GET", path: "/offers" },
    input: { schema: { queryParams: zAsinOffersQueryParams } },
});
