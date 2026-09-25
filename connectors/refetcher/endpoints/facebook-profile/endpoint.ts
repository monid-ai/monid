import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zProfileBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/facebook/profile",
    meta: {
        displayName: "Facebook Profile",
        summary:
            "Read public Facebook profile metadata and a page of recent post links.",
        description:
            "Fetch one Facebook profile or page by username. Optionally include one page of up to 3 public post links. Pass the returned pageInfo.recentPosts.endCursor as after to continue in another call. Inspect limitations and pageInfo.recentPosts.incomplete before treating the page as complete. Post references omit engagement metrics. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-facebook-profile",
        categories: ["facebook"],
    },
    request: { method: "POST", path: "/" },
    input: {
        schema: {
            body: zProfileBody.pick({
                platform: true,
                username: true,
                includeRecentPosts: true,
                pages: true,
                after: true,
            }).extend({
                platform: z.literal("facebook").default("facebook"),
                username: zProfileBody.shape.username.unwrap().regex(
                    /^@?[A-Za-z0-9.-]{1,100}$/,
                    "Provide one Facebook Profile username, not a URL or a list.",
                ),
                // One page is the native default and bounds the bill to one unit.
                pages: z.literal(1).default(1),
            }),
        },
    },
});
