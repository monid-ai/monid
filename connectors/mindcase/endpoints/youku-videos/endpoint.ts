import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoukuVideosBody } from "./schema/inputs.ts";

/**
 * Mindcase `youku/videos`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Youku Videos",
        summary: "Youku videos with title, URL, type, likes and comments. " +
            "Search by keyword.",
        description:
            "Youku videos with title, URL, type, likes and comments. " +
            "Search by keyword. Returns one row per video with videoId, " +
            "title, videoUrl, query, type, likes, comments, durationS, " +
            "published, category, paid, showId, showName, thumbnail, " +
            "channel, channelId, subscribers, channelAvatar. $0.0125 per " +
            "video; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/youku/videos",
        categories: ["video-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/youku/videos",
    request: { method: "POST", path: "/v1/data/youku/videos/run" },
    input: {
        schema: {
            body: zYoukuVideosBody.extend({
                maxResults: zYoukuVideosBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.0125 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
