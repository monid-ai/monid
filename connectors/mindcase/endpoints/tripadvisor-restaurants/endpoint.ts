import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTripadvisorRestaurantsBody } from "./schema/inputs.ts";

/**
 * Mindcase `tripadvisor/restaurants`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TripAdvisor Restaurants",
        summary: "TripAdvisor restaurants: contact, address, coordinates, " +
            "rating breakdown, ranking, cuisines, dishes, hours, menu " +
            "links, price level and photos.",
        description:
            "TripAdvisor restaurants: contact, address, coordinates, " +
            "rating breakdown, ranking, cuisines, dishes, hours, menu " +
            "links, price level and photos. Returns one row per " +
            "restaurant with id, name, type, subcategories, " +
            "tripadvisorUrl, description, address, neighborhood, " +
            "latitude, longitude, phone, email, website, rating, reviews, " +
            "ratingBreakdown, categoryRatings, reviewTags, rank, " +
            "rankOutOf, photos, photoCount, cuisines, popularDishes, " +
            "mealTypes, dietaryRestrictions, features, " +
            "establishmentTypes, priceLevel, openingHours and 4 more " +
            "fields. Call it by search (query) or url (startUrls). $0.002 " +
            "per restaurant; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tripadvisor/restaurants",
        categories: ["local-business"],
        notes: [
            "`maxResults` does not apply to `startUrls`: those return one " +
            "row per entry.",
            "Setting `maxPhotosPerPlace` above 0 adds $0.0005 per " +
            "delivered photo, up to `maxPhotosPerPlace` for each " +
            "restaurant.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/tripadvisor/restaurants",
    request: { method: "POST", path: "/v1/data/tripadvisor/restaurants/run" },
    input: {
        schema: {
            body: zTripadvisorRestaurantsBody.extend({
                maxResults: zTripadvisorRestaurantsBody.shape.maxResults
                    .unwrap().min(1).describe(
                        "Number of restaurants to return. Required, at least 1.",
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
                    label: "restaurants",
                    description: "restaurants returned",
                    consumes: { credit: "default", amount: 0.002 },
                },
                max_photos_per_place: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "photos",
                    description:
                        "photos delivered: up to maxPhotosPerPlace per restaurant",
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
