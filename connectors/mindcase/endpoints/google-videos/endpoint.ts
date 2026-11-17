import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleVideosBody } from "./schema/inputs.ts";

/**
 * Mindcase `google/videos`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Videos",
        summary: "Google video search results with title, URL, source, " +
            "channel, duration and published date. Search by keyword.",
        description: "Google video search results with title, URL, source, " +
            "channel, duration and published date. Search by keyword. " +
            "Returns one row per video with rank, title, videoUrl, " +
            "source, channel, durationS, publishedDate, snippet, " +
            "thumbnailUrl. For YouTube data with engagement use " +
            "mindcase#youtube/videos. $0.003 per video; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google/videos",
        categories: ["video-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google/videos",
    request: { method: "POST", path: "/v1/data/google/videos/run" },
    input: {
        schema: {
            body: zGoogleVideosBody.extend({
                maxResults: zGoogleVideosBody.shape.maxResults.unwrap().min(1)
                    .default(50).describe(
                        "How many videos to return in total.",
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
