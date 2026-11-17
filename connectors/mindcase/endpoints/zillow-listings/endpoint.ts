import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zZillowListingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `zillow/listings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Zillow Listings",
        summary:
            "Zillow property listings with ZPID and full address. Search " +
            "by location or home type.",
        description:
            "Zillow property listings with ZPID and full address. Search " +
            "by location or home type. Returns one row per listing with " +
            "listingUrl, zpid, address, street, city, state, zipCode, " +
            "latitude, longitude, listingType, status, statusText, " +
            "homeType, isBuilding, price, beds, baths, sqft, lotSizeSqft, " +
            "daysOnZillow, zestimate, rentZestimate, taxAssessedValue, " +
            "brokerName, isFsbo, isNewConstruction, isForeclosure, " +
            "isAuction, isComingSoon, isOpenHouse and 1 more fields. For " +
            "agents use mindcase#zillow/agents; for Redfin use " +
            "mindcase#redfin/listings. $0.002 per listing; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/zillow/listings",
        categories: ["real-estate"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/zillow/listings",
    request: { method: "POST", path: "/v1/data/zillow/listings/run" },
    input: {
        schema: {
            body: zZillowListingsBody.extend({
                maxResults: zZillowListingsBody.shape.maxResults.unwrap().min(1)
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
