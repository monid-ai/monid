import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAirbnbListingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `airbnb/listings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Airbnb Listings",
        summary: "Get Airbnb listing records (price, availability, ratings, " +
            "host info, amenities, photos) by listing URL or by location " +
            "search.",
        description:
            "Get Airbnb listing records (price, availability, ratings, " +
            "host info, amenities, photos) by listing URL or by location " +
            "search. Returns one row per listing with listingUrl, title, " +
            "propertyType, roomType, capacity, summaryDetails, " +
            "description, location, locationSubtitle, locationPath, " +
            "latitude, longitude, neighborhoodNotes, ratings, highlights, " +
            "amenities, houseRules, cancellationPolicy, available, " +
            "totalPrice, pricePerNight, baseSubtotal, priceQualifier, " +
            "host, coHosts, images, thumbnail. Call it by url (urls) or " +
            "location (location). For review text use " +
            "mindcase#airbnb/reviews. $0.002 per listing; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/airbnb/listings",
        categories: ["hotels"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "`checkIn` must be sent together with `checkOut`.",
            "`checkOut` must be sent together with `checkIn`.",
        ],
    },
    endpoint: "/airbnb/listings",
    request: { method: "POST", path: "/v1/data/airbnb/listings/run" },
    input: {
        schema: {
            body: zAirbnbListingsBody.extend({
                maxResults: zAirbnbListingsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many listings to return from a location search. Defaults to 100; at most 5,000. Not used with listing URLs, which return one listing per URL.",
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
            const capped =
                (body.location ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.urls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
