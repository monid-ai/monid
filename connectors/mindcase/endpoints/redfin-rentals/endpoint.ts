import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRedfinRentalsBody } from "./schema/inputs.ts";

/**
 * Mindcase `redfin/rentals`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Redfin Rentals",
        summary: "Redfin rental listings with monthly rent range, beds and " +
            "baths ranges, square footage, available units and move-in " +
            "dates. Search by city or ZIP code.",
        description:
            "Redfin rental listings with monthly rent range, beds and " +
            "baths ranges, square footage, available units and move-in " +
            "dates. Search by city or ZIP code. Returns one row per " +
            "listing with listingUrl, propertyId, propertyName, address, " +
            "city, state, zipCode, latitude, longitude, propertyType, " +
            "status, rentMin, rentMax, bedsMin, bedsMax, bathsMin, " +
            "bathsMax, sqftMin, sqftMax, availableUnits, availableDate, " +
            "updatedAt, description, hasVirtualTour, badges, imageUrl, " +
            "photos. For homes for sale or sold use " +
            "mindcase#redfin/listings. $0.002 per listing; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/redfin/rentals",
        categories: ["real-estate"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/redfin/rentals",
    request: { method: "POST", path: "/v1/data/redfin/rentals/run" },
    input: {
        schema: {
            body: zRedfinRentalsBody.extend({
                maxResults: zRedfinRentalsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many rentals to return in total.",
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
