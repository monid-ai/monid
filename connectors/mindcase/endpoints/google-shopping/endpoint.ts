import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleShoppingBody } from "./schema/inputs.ts";

/**
 * Mindcase `google/shopping`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Shopping",
        summary: "Extract Google Shopping product listings and details by " +
            "keyword, country, language, count, and date range.",
        description:
            "Extract Google Shopping product listings and details by " +
            "keyword, country, language, count, and date range. Returns " +
            "one row per result with title, merchant, price, priceValue, " +
            "rating, reviewCount, position, productId, image, productUrl, " +
            "searchQuery, currency. $0.003 per result; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google/shopping",
        categories: ["google-shopping"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google/shopping",
    request: { method: "POST", path: "/v1/data/google/shopping/run" },
    input: {
        schema: {
            body: zGoogleShoppingBody.extend({
                maxResults: zGoogleShoppingBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of products to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.003 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
