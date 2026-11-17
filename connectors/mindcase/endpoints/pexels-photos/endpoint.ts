import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPexelsPhotosBody } from "./schema/inputs.ts";

/**
 * Mindcase `pexels/photos`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pexels Photos",
        summary: "Pexels stock photos with title, description, width, height " +
            "and orientation. Search by keyword.",
        description:
            "Pexels stock photos with title, description, width, height " +
            "and orientation. Search by keyword. Returns one row per " +
            "photo with photoUrl, photoId, title, description, width, " +
            "height, orientation, tags, colors, license, posted, " +
            "authorName, authorUsername, authorId, authorProfileUrl, " +
            "authorLocation, authorInstagram, authorTwitter, imageUrl, " +
            "imageLargeUrl, imageMediumUrl, imageSmallUrl. $0.0035 per " +
            "photo; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/pexels/photos",
        categories: ["image-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/pexels/photos",
    request: { method: "POST", path: "/v1/data/pexels/photos/run" },
    input: {
        schema: {
            body: zPexelsPhotosBody.extend({
                maxResults: zPexelsPhotosBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many photos to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0035 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
