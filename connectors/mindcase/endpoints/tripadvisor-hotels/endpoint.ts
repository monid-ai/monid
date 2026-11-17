import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTripadvisorHotelsBody } from "./schema/inputs.ts";

/**
 * Mindcase `tripadvisor/hotels`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TripAdvisor Hotels",
        summary: "TripAdvisor hotels: contact, address, coordinates, rating " +
            "breakdown, ranking, class, room count, amenities, price " +
            "range, OTA offers and photos.",
        description:
            "TripAdvisor hotels: contact, address, coordinates, rating " +
            "breakdown, ranking, class, room count, amenities, price " +
            "range, OTA offers and photos. Returns one row per hotel with " +
            "id, name, subcategories, tripadvisorUrl, description, " +
            "address, latitude, longitude, nearbyTransit, phone, email, " +
            "website, rating, reviews, ratingBreakdown, reviewTags, " +
            "categoryRatingBreakdown, rank, rankOutOf, photos, " +
            "photoCount, hotelClass, rooms, priceRange, priceLevel, " +
            "amenities, hotelOffers, roomTips. Call it by search (query) " +
            "or url (startUrls). $0.002 per hotel; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tripadvisor/hotels",
        categories: ["hotels"],
        notes: [
            "`maxResults` does not apply to `startUrls`: those return one " +
            "row per entry.",
            "Setting `maxPhotosPerPlace` above 0 adds $0.0005 per " +
            "delivered photo, up to `maxPhotosPerPlace` for each hotel.",
            "`checkInDate` must be sent together with `checkOutDate`.",
            "`checkOutDate` must be sent together with `checkInDate`.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/tripadvisor/hotels",
    request: { method: "POST", path: "/v1/data/tripadvisor/hotels/run" },
    input: {
        schema: {
            body: zTripadvisorHotelsBody.extend({
                maxResults: zTripadvisorHotelsBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Number of hotels to return. Required, at least 1.",
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
                    label: "hotels",
                    description: "hotels returned",
                    consumes: { credit: "default", amount: 0.002 },
                },
                max_photos_per_place: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "photos",
                    description:
                        "photos delivered: up to maxPhotosPerPlace per hotel",
                    consumes: { credit: "default", amount: 0.0005 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.query ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped =
                (body.startUrls ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return {
                counts: {
                    row: rows,
                    max_photos_per_place: rows * (body.maxPhotosPerPlace ?? 0),
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
                    max_photos_per_place: delivered *
                        (body.maxPhotosPerPlace ?? 0),
                },
            };
        },
    },
});
