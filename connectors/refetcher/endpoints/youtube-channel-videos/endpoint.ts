import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zYouTubeChannelBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/youtube/channel-videos",
    meta: {
        displayName: "YouTube Channel Videos",
        summary:
            "Read a page of recent YouTube uploads with video engagement metrics.",
        description:
            "Fetch up to 12 recent uploads from one public YouTube channel, including available per-video views, likes, and comments. Pass a channel URL, @handle, or raw UC channel ID. The returned upload page counts as one successful scrape; failed scrapes are not charged.",
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
            }).extend({
                platform: z.literal("youtube").default("youtube"),
                type: z.literal("channelVideos").default("channelVideos"),
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
