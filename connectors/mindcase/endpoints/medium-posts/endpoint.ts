import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMediumPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `medium/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Medium Posts",
        summary: "Medium posts with title, subtitle, URL and author details. " +
            "Search by tag or keyword.",
        description:
            "Medium posts with title, subtitle, URL and author details. " +
            "Search by tag or keyword. Returns one row per post with " +
            "postId, postUrl, title, subtitle, authorName, authorHandle, " +
            "authorUrl, authorProfileId, authorFollowers, claps, " +
            "clappers, responses, readingTimeMinutes, wordCount, " +
            "postedDate, updatedDate, tags, language, memberOnly, " +
            "publicationName, publicationUrl, publicationFollowers, " +
            "previewImage, matchedInput. Call it by keyword search " +
            "(queries) or tag (tags). $0.002 per post; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/medium/posts",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/medium/posts",
    request: { method: "POST", path: "/v1/data/medium/posts/run" },
    input: {
        schema: {
            body: zMediumPostsBody.extend({
                maxResults: zMediumPostsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
