import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zProfileBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/instagram/profile",
    meta: {
        displayName: "Instagram Profile",
        summary:
            "Read public Instagram profile metadata and optional recent media links.",
        description:
            "Fetch one Instagram profile by username. Optionally include the first page of up to 12 recent public media references. References do not include per-post engagement; use Instagram Post for those metrics. This connector allows one page per call. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-instagram-profile",
        categories: ["instagram"],
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
                platform: z.literal("instagram").default("instagram"),
                username: zProfileBody.shape.username.unwrap().regex(
                    /^@?[A-Za-z0-9._]{1,30}$/,
                    "Provide one Instagram Profile username, not a URL or a list.",
                ),
                // One page is the native default and bounds the bill to one unit.
                pages: z.literal(1).default(1),
            }),
        },
    },
});
