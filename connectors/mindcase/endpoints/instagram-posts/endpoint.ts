import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `instagram/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram Posts & Reels",
        summary: "Instagram posts and reels: captions, engagement, media, " +
            "music and authors. By profile (posts, reels, tagged), post " +
            "URL, hashtag or keyword.",
        description:
            "Instagram posts and reels: captions, engagement, media, " +
            "music and authors. By profile (posts, reels, tagged), post " +
            "URL, hashtag or keyword. Returns one row per post with " +
            "postUrl, caption, type, contentFormat, posted, source, " +
            "authorUsername, authorName, authorProfileUrl, " +
            "authorVerified, authorId, likes, likesHidden, comments, " +
            "plays, views, shares, image, videoUrl, carouselImages, " +
            "carouselSlideMediaUrls, durationS, hashtags, mentions, " +
            "firstComment, recentComments, captionLanguage, locationName, " +
            "paidPartnership, pinned and 5 more fields. Pull a profile's " +
            "posts, reels, or tagged tab; look up specific post URLs; " +
            "pull recent posts under a hashtag; or search Reels by " +
            "keyword. For account-level data (bio, follower count, " +
            "business info) use mindcase#instagram/profiles; for the " +
            "comments on a post use mindcase#instagram/comments. $0.002 " +
            "per post; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/instagram/posts",
        categories: ["instagram"],
        notes: [
            "`maxResults` does not apply to `postUrls` / `query`: those " +
            "return one row per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/instagram/posts",
    request: { method: "POST", path: "/v1/data/instagram/posts/run" },
    input: {
        schema: {
            body: zInstagramPostsBody.extend({
                maxResults: zInstagramPostsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of posts to return in total. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.handles ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length +
                (body.hashtags ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = (body.postUrls?.length ?? 0) +
                (body.query ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
