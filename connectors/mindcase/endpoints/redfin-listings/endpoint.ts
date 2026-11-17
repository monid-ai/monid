import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRedfinListingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `redfin/listings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Redfin Listings",
        summary:
            "Redfin homes for sale and recently sold, with MLS ID, price, " +
            "beds, baths, square footage, year built and address. Search " +
            "by city or ZIP code.",
        description:
            "Redfin homes for sale and recently sold, with MLS ID, price, " +
            "beds, baths, square footage, year built and address. Search " +
            "by city or ZIP code. Returns one row per listing with " +
            "listingUrl, propertyId, mlsId, address, city, state, " +
            "zipCode, latitude, longitude, listingType, status, " +
            "propertyType, price, beds, baths, bathsFull, bathsPartial, " +
            "sqft, lotSizeSqft, yearBuilt, hoaDues, daysOnMarket, " +
            "listedAt, lastSoldDate, isNewConstruction, hasVirtualTour, " +
            "isRedfinListing, badges, imageUrl, photos. For rentals use " +
            "mindcase#redfin/rentals; for Zillow listings use " +
            "mindcase#zillow/listings; for Realtor.com use " +
            "mindcase#realtor/listings. $0.002 per listing; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/redfin/listings",
        categories: ["real-estate"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/redfin/listings",
    request: { method: "POST", path: "/v1/data/redfin/listings/run" },
    input: {
        schema: {
            body: zRedfinListingsBody.extend({
                maxResults: zRedfinListingsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many listings to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
