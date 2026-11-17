import { defineEndpoint } from "@shared/core";
import { zAsinHistoryQueryParams } from "./schema/inputs.ts";

/**
 * GET /history — Read the price history Asin has recorded for a product.
 *
 * Billing: Free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Asin Price History",
        summary: "Read the price history Asin has recorded for a product.",
        description:
            "Read the price history Asin has recorded for an ASIN: lowest, " +
            "highest and average price over the period, and the dated price " +
            "points. Empty when Asin has no history for the product yet.",
        docsUrl: "https://www.asin.dev/developers",
        categories: ["amazon"],
        notes: ["Free."],
    },
    request: { method: "GET", path: "/history" },
    input: { schema: { queryParams: zAsinHistoryQueryParams } },
});
