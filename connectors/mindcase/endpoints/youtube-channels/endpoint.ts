import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubeChannelsBody } from "./schema/inputs.ts";

/**
 * Mindcase `youtube/channels`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Channel Details",
        summary: "YouTube channel details: subscribers, total views and " +
            "videos, description, country, join date, verification and " +
            "social links. By URL, @handle or search.",
        description: "YouTube channel details: subscribers, total views and " +
            "videos, description, country, join date, verification and " +
            "social links. By URL, @handle or search. Returns one row per " +
            "channel with channelName, handle, channelId, channelUrl, " +
            "subscribers, totalViews, totalVideos, avgViewsPerVideo, " +
            "description, country, joinedDate, joinedYear, verified, " +
            "hasVideos, avatarUrl, bannerUrl, instagramUrl, twitterXUrl, " +
            "tiktokUrl, websiteUrl, links. Look up YouTube channel " +
            "profiles by channel URL, @handle, or keyword search. For the " +
            "channel's videos use mindcase#youtube/videos; for community " +
            "tab posts use mindcase#youtube/community-posts. $0.0005 per " +
            "channel; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/youtube/channels",
        categories: ["youtube"],
    },
    endpoint: "/youtube/channels",
    request: { method: "POST", path: "/v1/data/youtube/channels/run" },
    input: {
        schema: {
            body: zYoutubeChannelsBody,
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
            const capped = (body.urls?.length ?? 0) +
                (body.query ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
