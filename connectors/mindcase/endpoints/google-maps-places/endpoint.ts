import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleMapsPlacesBody } from "./schema/inputs.ts";

/**
 * Mindcase `google-maps/places`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Maps Places",
        summary: "Search Google Maps places for address, rating, reviews, " +
            "contact info, opening hours, and images.",
        description:
            "Search Google Maps places for address, rating, reviews, " +
            "contact info, opening hours, and images. Returns one row per " +
            "place with placeUrl, businessName, placeId, category, " +
            "allCategories, categoryId, placeTags, rating, reviews, " +
            "reviewBreakdown, reviewKeywords, reviewsUrl, priceRange, " +
            "phone, website, emails, additionalPhones, socials, " +
            "directoryProfiles, address, neighborhood, city, state, " +
            "postalCode, country, street, latitude, longitude, " +
            "entranceLocation, plusCode and 48 more fields. Two ways to " +
            "find places: pass Search Terms + Location to discover, or " +
            "pass Place URLs / IDs to look up specific ones. For a " +
            "place's review text use mindcase#google-maps/reviews. $0.004 " +
            "per place; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google-maps/places",
        categories: ["maps", "local-business"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "Setting `maxImages` above 0 adds $0.00025 per delivered " +
            "image, up to `maxImages` for each place.",
            "`keywords` must be sent together with `location`.",
            "`location` must be sent together with `keywords`.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google-maps/places",
    request: { method: "POST", path: "/v1/data/google-maps/places/run" },
    input: {
        schema: {
            body: zGoogleMapsPlacesBody.extend({
                maxResults: zGoogleMapsPlacesBody.shape.maxResults.unwrap().min(
                    1,
                ).describe("Number of places to return. Required, at least 1."),
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
                    label: "places",
                    description: "places returned",
                    consumes: { credit: "default", amount: 0.004 },
                },
                max_images: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "images",
                    description: "images delivered: up to maxImages per place",
                    consumes: { credit: "default", amount: 0.00025 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.keywords ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length +
                (body.location ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.urls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return {
                counts: { row: rows, max_images: rows * (body.maxImages ?? 0) },
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
                    max_images: delivered * (body.maxImages ?? 0),
                },
            };
        },
    },
});
