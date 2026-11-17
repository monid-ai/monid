import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMercadolibreListingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `mercadolibre/listings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "MercadoLibre Listings",
        summary: "MercadoLibre listings with title, URL, catalog product ID, " +
            "brand and price. Search by keyword or country.",
        description:
            "MercadoLibre listings with title, URL, catalog product ID, " +
            "brand and price. Search by keyword or country. Returns one " +
            "row per listing with itemId, title, productUrl, " +
            "catalogProductId, marketplace, brand, price, currency, " +
            "listPrice, discountPercent, conditionalPrice, " +
            "conditionalPriceNote, installments, condition, " +
            "soldQuantityApprox, rating, soldBy, officialStore, " +
            "officialStoreName, freeShipping, shipping, nextDayDelivery, " +
            "international, badge, categoryId, domainId, variations, " +
            "variationCount, searchRank, mainImage. $0.003 per listing; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/mercadolibre/listings",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/mercadolibre/listings",
    request: { method: "POST", path: "/v1/data/mercadolibre/listings/run" },
    input: {
        schema: {
            body: zMercadolibreListingsBody.extend({
                maxResults: zMercadolibreListingsBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many listings to return in total.",
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
