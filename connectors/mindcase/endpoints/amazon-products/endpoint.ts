import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAmazonProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `amazon/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Products",
        summary:
            "Complete Amazon product data by product URL or ASIN from any " +
            "marketplace, or by keyword. Full detail page for every " +
            "product either way.",
        description:
            "Complete Amazon product data by product URL or ASIN from any " +
            "marketplace, or by keyword. Full detail page for every " +
            "product either way. Returns one row per product with asin, " +
            "title, brand, productUrl, marketplace, price, currency, " +
            "listPrice, discount, onDeal, prime, availability, rating, " +
            "ratingsCount, boughtPastMonth, boughtPastMonthMin, " +
            "bestSellersRank, bsrCategory, searchRank, soldBy, " +
            "fulfilledBy, sellerId, usedOffer, features, description, " +
            "categoryPath, browseNodeId, productDetails, keySpecs, " +
            "bookEditions and 6 more fields. Call it by url (urls) or " +
            "keyword (keywords). For review text use " +
            "mindcase#amazon/reviews; for Amazon Now quick-commerce " +
            "listings in India use mindcase#amazon-now/products. $0.0015 " +
            "per product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/amazon/products",
        categories: ["amazon"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "Adds a flat $0.01 search fee per run that uses `keywords`, " +
            "charged even when nothing is found.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/amazon/products",
    request: { method: "POST", path: "/v1/data/amazon/products/run" },
    input: {
        schema: {
            body: zAmazonProductsBody.extend({
                maxResults: zAmazonProductsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of products to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                row: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "products",
                    description: "products returned",
                    consumes: { credit: "default", amount: 0.0015 },
                },
                search_search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search fee",
                    description:
                        "one flat fee per search run, charged even when nothing is found",
                    consumes: { credit: "default", amount: 0.01 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.keywords ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.urls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return {
                counts: {
                    row: rows,
                    search_search: ((body.keywords ?? "").split("\n").filter((
                            line: string,
                        ) => line.trim() !== ""
                        ).length) > 0
                        ? 1
                        : 0,
                },
            };
        },
        evidence: ({ data, utils }) => {
            const input = (data.input.body ?? {}) as Record<string, unknown>;
            // deno-lint-ignore no-explicit-any
            const body = (input.params ?? input) as any;
            const delivered = utils.json.optionalLen(data.output, "$.data") ??
                0;
            return {
                counts: {
                    row: delivered,
                    search_search: ((body.keywords ?? "").split("\n").filter((
                            line: string,
                        ) => line.trim() !== ""
                        ).length) > 0
                        ? 1
                        : 0,
                },
            };
        },
    },
});
