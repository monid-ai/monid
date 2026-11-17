import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRealtorListingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `realtor/listings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Realtor Listings",
        summary:
            "Realtor.com property listings with status, property type and " +
            "price. Search by location or property type.",
        description:
            "Realtor.com property listings with status, property type and " +
            "price. Search by location or property type. Returns one row " +
            "per listing with listingUrl, propertyId, listingId, status, " +
            "propertyType, propertySubType, price, priceMin, priceMax, " +
            "priceReducedAmount, beds, bedsMin, bedsMax, baths, " +
            "bathsConsolidated, bathsMin, bathsMax, sqft, sqftMin, " +
            "sqftMax, lotSqft, garage, yearBuilt, listDate, lastSoldDate, " +
            "lastSoldPrice, location, latitude, longitude, flags and 3 " +
            "more fields. For Zillow use mindcase#zillow/listings; for " +
            "Redfin use mindcase#redfin/listings. $0.003 per listing; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/realtor/listings",
        categories: ["real-estate"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/realtor/listings",
    request: { method: "POST", path: "/v1/data/realtor/listings/run" },
    input: {
        schema: {
            body: zRealtorListingsBody.extend({
                maxResults: zRealtorListingsBody.shape.maxResults.unwrap().min(
                    1,
                ).default(100).describe(
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
