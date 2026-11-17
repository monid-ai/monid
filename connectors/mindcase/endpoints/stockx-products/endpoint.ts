import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zStockxProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `stockx/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "StockX Products",
        summary:
            "Full StockX product detail with live market data: every size " +
            "with its ask, bid and last sale. One row per product, from a " +
            "brand, search or product URL.",
        description:
            "Full StockX product detail with live market data: every size " +
            "with its ask, bid and last sale. One row per product, from a " +
            "brand, search or product URL. Returns one row per product " +
            "with productId, productUrl, primaryTitle, secondaryTitle, " +
            "brand, model, colorway, styleId, category, subCategory, " +
            "categoryPath, contentGroup, gender, condition, " +
            "sizeConvention, retailPrice, releaseDate, description, tags, " +
            "lastSale, sales72Hours, averagePrice90Days, sales90Days, " +
            "priceVolatility, sales12Months, averagePrice12Months, bids, " +
            "askInventoryType, expressAskCount, expressShipLowestAsk and " +
            "5 more fields. Call it by listing url (listing_url), search " +
            "(query) or product url (urls). $0.001 per product; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/stockx/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/stockx/products",
    request: { method: "POST", path: "/v1/data/stockx/products/run" },
    input: {
        schema: {
            body: zStockxProductsBody.extend({
                maxResults: zStockxProductsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of products to return from a brand page or a search. Ignored when you pass product URLs. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.listing_url ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length +
                (body.query ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.urls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
