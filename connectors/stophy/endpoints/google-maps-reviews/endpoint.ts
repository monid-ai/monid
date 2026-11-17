import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zGoogleMapsReviewsBody } from "./schema/inputs.ts";

/**
 * `POST /v1/google/maps/reviews` — one page of a place's Google Maps
 * reviews. 1 unit per call, billed only when `results` is non-empty ⇒ leaf
 * PER_UNIT counted off the response.
 */
export default defineEndpoint({
    meta: {
        displayName: "Stophy Google Maps Reviews",
        summary: "A Google Maps place's reviews.",
        description: "Get a page of a place's Google Maps reviews " +
            "(`rating`, `text`, `publishedAt`, `authorName`, " +
            "`authorIsLocalGuide`, `ownerReplyText`). Send `placeUrl` or " +
            "`placeId` (from `stophy#google/maps/search`), not both. " +
            "`sort` is newest (default), relevance, highest or lowest. " +
            "Page by sending back the response's `cursor`.",
        docsUrl:
            "https://docs.stophy.dev/api-reference/endpoint/google-maps-reviews",
        categories: ["maps"],
        notes: [
            "1 Stophy call when reviews come back; an empty answer is free.",
        ],
    },
    request: { method: "POST", path: "/google/maps/reviews" },
    input: {
        schema: {
            body: z.union([
                zGoogleMapsReviewsBody.omit({ placeId: true })
                    .required({ placeUrl: true }),
                zGoogleMapsReviewsBody.omit({ placeUrl: true })
                    .required({ placeId: true }),
            ]),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "review pages with results",
            description: "one call that returned at least one review",
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
