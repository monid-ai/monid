import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRumbleVideosBody } from "./schema/inputs.ts";

/**
 * Mindcase `rumble/videos`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Rumble Videos",
        summary:
            "Rumble videos with title, URL, short flag, views, likes and " +
            "dislikes. Search by keyword or pass channel URLs.",
        description:
            "Rumble videos with title, URL, short flag, views, likes and " +
            "dislikes. Search by keyword or pass channel URLs. Returns " +
            "one row per video with videoId, title, videoUrl, isShort, " +
            "views, likes, dislikes, comments, durationS, published, " +
            "description, categories, tags, isLive, thumbnail, " +
            "availableCaptions, channel, channelId, channelHandle, " +
            "channelUrl, followers, channelVerified, channelBadges, " +
            "channelAvatar, sourceQuery. Call it by search keywords " +
            "(queries) or channel urls (channelUrls). $0.003 per video; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/rumble/videos",
        categories: ["video-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/rumble/videos",
    request: { method: "POST", path: "/v1/data/rumble/videos/run" },
    input: {
        schema: {
            body: zRumbleVideosBody.extend({
                maxResults: zRumbleVideosBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.003 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
