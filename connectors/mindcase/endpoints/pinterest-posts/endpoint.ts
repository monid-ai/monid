import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPinterestPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `pinterest/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pinterest Posts",
        summary:
            "Pinterest pins with title, description, alt text and image. " +
            "Search by keyword or pass pin URLs.",
        description:
            "Pinterest pins with title, description, alt text and image. " +
            "Search by keyword or pass pin URLs. Returns one row per post " +
            "with pinUrl, pinId, title, description, altText, image, " +
            "imageWidth, imageHeight, isVideo, link, domain, engagement, " +
            "comments, created, pinner, board, hashtags, sourceType. Call " +
            "it by search query (query) or urls (urls). $0.0035 per post; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/pinterest/posts",
        categories: ["social-media"],
        notes: [
            "Requires a search keyword, or one or more Pinterest " +
            "board/profile URLs.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/pinterest/posts",
    request: { method: "POST", path: "/v1/data/pinterest/posts/run" },
    input: {
        schema: {
            body: zPinterestPostsBody.extend({
                maxResults: zPinterestPostsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many posts to return in total.",
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
