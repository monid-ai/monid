import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookMarketplaceBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/marketplace`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Facebook Marketplace",
        summary: "Extract Facebook Marketplace listings (title, price, " +
            "condition, location, attributes, and photos) from any " +
            "category or search URL.",
        description: "Extract Facebook Marketplace listings (title, price, " +
            "condition, location, attributes, and photos) from any " +
            "category or search URL. Returns one row per listing with " +
            "listingTitle, listingUrl, description, price, currency, " +
            "originalPrice, condition, attributes, mileage, location, " +
            "city, state, postalCode, country, latitude, longitude, " +
            "deliveryOptions, listedAt, primaryPhoto, photos, videoUrl. " +
            "Paste a Facebook Marketplace category or search URL to pull " +
            "its listings. $0.01 per listing; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/marketplace",
        categories: ["facebook", "ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/facebook/marketplace",
    request: { method: "POST", path: "/v1/data/facebook/marketplace/run" },
    input: {
        schema: {
            body: zFacebookMarketplaceBody.extend({
                maxResults: zFacebookMarketplaceBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Number of listings to return in total. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
