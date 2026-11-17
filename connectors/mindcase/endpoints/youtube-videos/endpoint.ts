import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubeVideosBody } from "./schema/inputs.ts";

/**
 * Mindcase `youtube/videos`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Videos & Reels",
        summary: "YouTube videos and Reels by search, channel URL or video " +
            "URL, with views, likes, comments, duration, publish date, " +
            "description, keywords and thumbnails.",
        description:
            "YouTube videos and Reels by search, channel URL or video " +
            "URL, with views, likes, comments, duration, publish date, " +
            "description, keywords and thumbnails. Returns one row per " +
            "video with type, title, videoUrl, views, likes, comments, " +
            "durationS, published, description, keywords, category, " +
            "availableCaptions, isLive, thumbnail, channel, channelId, " +
            "channelHandle, subscribers, channelUrl, channelBadges, " +
            "channelAvatar. Call it by search (query), channel " +
            "(channelUrl) or video url (urls). For channel-level stats " +
            "use mindcase#youtube/channels; for comments on a video use " +
            "mindcase#youtube/comments. $0.0005 per video; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/youtube/videos",
        categories: ["youtube"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
        ],
    },
    endpoint: "/youtube/videos",
    request: { method: "POST", path: "/v1/data/youtube/videos/run" },
    input: {
        schema: {
            body: zYoutubeVideosBody.extend({
                maxResults: zYoutubeVideosBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Total number of videos to return. Applies to Search and Channel modes. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.query ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length +
                (body.channelUrl ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.urls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
