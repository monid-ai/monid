import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookPhotosBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/photos`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Facebook Photos",
        summary:
            "Get Facebook photos with photo url, image url, caption, alt " +
            "text, posted at, reactions, by urls.",
        description:
            "Get Facebook photos with photo url, image url, caption, alt " +
            "text, posted at, reactions, by urls. Returns one row per " +
            "photo with photoId, photoUrl, imageUrl, caption, altText, " +
            "postedAt, reactions, comments, shares, reactionBreakdown, " +
            "width, height, postId, postUrl, albumId, page. For posts and " +
            "reels use mindcase#facebook/posts. $0.0035 per photo; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/photos",
        categories: ["facebook"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/facebook/photos",
    request: { method: "POST", path: "/v1/data/facebook/photos/run" },
    input: {
        schema: {
            body: zFacebookPhotosBody.extend({
                maxResults: zFacebookPhotosBody.shape.maxResults.unwrap().min(1)
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
