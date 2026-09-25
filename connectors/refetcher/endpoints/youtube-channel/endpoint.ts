import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zYouTubeChannelBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/youtube/channel",
    meta: {
        displayName: "YouTube Channel",
        summary:
            "Read public YouTube channel metadata and optional recent upload links.",
        description:
            "Fetch one public YouTube channel by channel URL, @handle, or raw UC channel ID. Returns channel metadata such as subscribers, total views, video count, and thumbnails. Optional recent uploads are links-only references, capped at 12 for one billable page. Use YouTube Channel Videos for upload engagement metrics. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-youtube-channel",
        categories: ["youtube"],
    },
    request: { method: "POST", path: "/" },
    input: {
        schema: {
            body: zYouTubeChannelBody.pick({
                platform: true,
                type: true,
                channelUrl: true,
                recentVideosLimit: true,
                includeRecentVideos: true,
            }).extend({
                platform: z.literal("youtube").default("youtube"),
                type: z.literal("channel").default("channel"),
                channelUrl: zYouTubeChannelBody.shape.channelUrl.unwrap().regex(
                    /^(?:UC[A-Za-z0-9_-]{20,}|@[A-Za-z0-9._-]{3,}|https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:@[A-Za-z0-9._-]+|channel\/UC[A-Za-z0-9_-]{20,}|user\/[A-Za-z0-9._-]+)\/?(?:[?#][^\s]*)?)$/,
                    "Provide one YouTube channel URL, @handle, or UC channel ID.",
                ),
                // The public API defaults to 12; cap this connector at one page.
                recentVideosLimit: zYouTubeChannelBody.shape.recentVideosLimit
                    .unwrap().max(12).default(12),
            }),
        },
    },
});
