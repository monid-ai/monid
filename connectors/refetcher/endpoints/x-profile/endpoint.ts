import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zProfileBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/x/profile",
    meta: {
        displayName: "X Profile",
        summary:
            "Read public X (Twitter) profile metadata and optional public posts.",
        description:
            "Fetch one X (Twitter) profile by username. Optionally include one page of up to 5 public posts, ordered by latest or popular, with the per-post fields exposed by the source. Authored replies are excluded. This connector allows one page per call. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-x-profile",
        categories: ["twitter"],
    },
    request: { method: "POST", path: "/" },
    input: {
        schema: {
            body: zProfileBody.pick({
                platform: true,
                username: true,
                includeRecentPosts: true,
                pages: true,
                sort: true,
            }).extend({
                platform: z.literal("x").default("x"),
                username: zProfileBody.shape.username.unwrap().regex(
                    /^@?[A-Za-z0-9_]{1,15}$/,
                    "Provide one X Profile username, not a URL or a list.",
                ),
                // One page is the native default and bounds the bill to one unit.
                pages: z.literal(1).default(1),
            }),
        },
    },
});
