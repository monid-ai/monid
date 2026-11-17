import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleHotelsHotelsBody } from "./schema/inputs.ts";

/**
 * Mindcase `google-hotels/hotels`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Hotels",
        summary: "Hotels from Google Hotels with property and place IDs, " +
            "category, star rating and prices for your dates. Search by " +
            "location, check-in and check-out date, or...",
        description: "Hotels from Google Hotels with property and place IDs, " +
            "category, star rating and prices for your dates. Search by " +
            "location, check-in and check-out date, or hotel class. " +
            "Returns one row per hotel with name, hotelUrl, propertyId, " +
            "placeId, category, starRating, checkIn, checkOut, " +
            "pricePerNight, totalPrice, currency, originalPricePerNight, " +
            "priceHistory, rating, reviews, ratingDistribution, " +
            "reviewAspects, externalRatings, reviewSummaryPositive, " +
            "reviewSummaryNegative, featuredReviewSnippets, amenities, " +
            "address, phone, website, latitude, longitude, neighborhood, " +
            "neighborhoodDescription, locationHierarchy and 12 more " +
            "fields. For Booking.com's own listing detail use " +
            "mindcase#booking/listings; for TripAdvisor ratings use " +
            "mindcase#tripadvisor/hotels. $0.002 per hotel; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google-hotels/hotels",
        categories: ["hotels"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google-hotels/hotels",
    request: { method: "POST", path: "/v1/data/google-hotels/hotels/run" },
    input: {
        schema: {
            body: zGoogleHotelsHotelsBody.extend({
                maxResults: zGoogleHotelsHotelsBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many hotels to return in total.",
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
