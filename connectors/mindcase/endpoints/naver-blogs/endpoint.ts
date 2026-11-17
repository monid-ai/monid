import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNaverBlogsBody } from "./schema/inputs.ts";

/**
 * Mindcase `naver/blogs`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Naver Blogs",
        summary: "Naver blog posts with title, snippet, author and blog ID. " +
            "Search by keyword.",
        description:
            "Naver blog posts with title, snippet, author and blog ID. " +
            "Search by keyword. Returns one row per blog with postUrl, " +
            "postId, blogId, keyword, title, snippet, authorName, " +
            "blogName, authorUrl, authorAvatar, posted, category, " +
            "selfPaid, marketPost, postText, images, places, links, " +
            "videos. $0.003 per blog; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/naver/blogs",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/naver/blogs",
    request: { method: "POST", path: "/v1/data/naver/blogs/run" },
    input: {
        schema: {
            body: zNaverBlogsBody.extend({
                maxResults: zNaverBlogsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many blogs to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.003 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
