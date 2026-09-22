import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zProfileBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/tiktok/profile",
    meta: {
        displayName: "TikTok Profile",
        summary:
            "Read public TikTok profile metadata and optional recent posts.",
        description:
            "Fetch one TikTok profile by username. Optionally include the first page of up to 12 recent public posts. Returned posts can include available engagement metrics, rich media, and image slideshows. This connector allows one page per call. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-tiktok-profile",
        categories: ["tiktok"],
    },
    request: { method: "POST", path: "/" },
    input: {
        schema: {
            body: zProfileBody.pick({
                platform: true,
                username: true,
                includeRecentPosts: true,
                pages: true,
            }).extend({
                platform: z.literal("tiktok").default("tiktok"),
                username: zProfileBody.shape.username.unwrap().regex(
                    /^@?[A-Za-z0-9._-]{1,64}$/,
                    "Provide one TikTok Profile username, not a URL or a list.",
                ),
                // One page is the native default and bounds the bill to one unit.
                pages: z.literal(1).default(1),
            }),
        },
    },
});
