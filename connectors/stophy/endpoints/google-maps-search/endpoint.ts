import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleMapsSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/google/maps/search` — places near a location from Google Maps.
 * 1 unit per call, billed only when `results` is non-empty ⇒ leaf PER_UNIT
 * counted off the response.
 */
export default defineEndpoint({
    meta: {
        displayName: "Stophy Google Maps Search",
        summary: "Find places near a location on Google Maps.",
        description: "Search Google Maps for places near a `location` " +
            "and get `placeId`, `name`, `categories`, `address`, " +
            "`latitude` / `longitude`, `rating`, `reviews`, `phone`, " +
            "`website`, `hours` and `openStatus`. Filter with " +
            "`minRating` and `openNow`; page with `page` (1-10). Pass a " +
            "result's `placeId` to `stophy#google/maps/reviews` for its " +
            "reviews.",
        docsUrl:
            "https://docs.stophy.dev/api-reference/endpoint/google-maps-search",
        categories: ["maps"],
        notes: [
            "1 Stophy call when places come back; an empty answer is free.",
        ],
    },
    request: { method: "POST", path: "/google/maps/search" },
    input: { schema: { body: zGoogleMapsSearchBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "searches with results",
            description: "one call that returned at least one place",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Bills only when `results` is non-empty — Stophy charges nothing
         *  for an empty answer. */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalGet(
                data.output,
                "$.data.results",
            );
            return {
                counts: {
                    RESULT: Array.isArray(results) && results.length > 0
                        ? 1
                        : 0,
                },
            };
        },
    },
});
