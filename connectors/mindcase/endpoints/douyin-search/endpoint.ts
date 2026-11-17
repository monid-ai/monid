import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDouyinSearchBody } from "./schema/inputs.ts";

/**
 * Mindcase `douyin/search`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Douyin Search",
        summary: "Douyin videos with caption, author, posted date and view, " +
            "like and comment counts. Search by keyword.",
        description:
            "Douyin videos with caption, author, posted date and view, " +
            "like and comment counts. Search by keyword. Returns one row " +
            "per video with postUrl, caption, author, postedDate, views, " +
            "likes, comments, shares, saves, language, isSlideshow, isAd, " +
            "hashtags, categories, slideshowImages, thumbnail, durationS, " +
            "resolution, sound, location, place, series, sourceQuery. " +
            "$0.0065 per video; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/douyin/search",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/douyin/search",
    request: { method: "POST", path: "/v1/data/douyin/search/run" },
    input: {
        schema: {
            body: zDouyinSearchBody.extend({
                maxResults: zDouyinSearchBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many videos to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0065 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
