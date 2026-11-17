import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Posts",
        summary:
            "TikTok videos and photo posts by profile, hashtag, keyword, " +
            "post URL or sound, with engagement metrics, author stats, " +
            "hashtags, mentions and music.",
        description:
            "TikTok videos and photo posts by profile, hashtag, keyword, " +
            "post URL or sound, with engagement metrics, author stats, " +
            "hashtags, mentions and music. Returns one row per post with " +
            "postUrl, author, caption, postedDate, views, likes, " +
            "comments, shares, saves, language, isSlideshow, isAd, " +
            "isSponsored, hashtags, mentions, effects, slideshowImages, " +
            "photoSlideshowImageUrls, thumbnail, durationS, resolution, " +
            "videoWidth, videoHeight, sound, location, locationAddress, " +
            "country, hashtagViews, sourceQuery, videoId. Call it by " +
            "profile (profiles), hashtag (hashtags), keyword " +
            "(searchQueries), post url (postURLs) or sound (musics). For " +
            "creator-level data use mindcase#tiktok/profiles; for the " +
            "comments on a video use mindcase#tiktok/comments. $0.002 per " +
            "post; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok/posts",
        categories: ["tiktok"],
        notes: [
            "`resultsPerPage` caps rows per input, so a run can return up " +
            "to that many rows for each `profiles` / `hashtags` / " +
            "`searchQueries` / `musics` entry.",
            "`resultsPerPage` does not apply to `postURLs`: those return " +
            "one row per entry.",
            "`resultsPerPage` must be at least 1 here; the raw API reads " +
            "0 or blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/tiktok/posts",
    request: { method: "POST", path: "/v1/data/tiktok/posts/run" },
    input: {
        schema: {
            body: zTiktokPostsBody.extend({
                resultsPerPage: zTiktokPostsBody.shape.resultsPerPage.unwrap()
                    .min(1).describe(
                        "Number of posts to return. Required, at least 1.",
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
                (body.profiles ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length +
                (body.hashtags ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length +
                (body.searchQueries ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length +
                (body.musics ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.postURLs?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0
                    ? body.resultsPerPage * Math.max(1, capped)
                    : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
