import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRedditScraperProBody } from "./schema/inputs.ts";
import { zRedditScraperProOutput } from "./schema/output.ts";

/**
 * leado/reddit-scraper-pro — Reddit Scraper Pro. Pure data; the async
 * machinery (lifecycle + fromError) is inherited leaf-wise from the apify
 * provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Reddit Scraper Pro",
        summary:
            "Scrape Reddit posts, comment threads, subreddits, user posts, " +
            "and keyword search results with $0 start fee.",
        description:
            "Scrapes Reddit posts, comment threads, subreddits, user " +
            "submissions, and keyword search results in one run without " +
            "a Reddit API key or login. Supports filtering by time window " +
            "(1h to 30d), keywords, minimum score, minimum comments, and " +
            "removing deleted/AutoMod posts, plus optional RAG Markdown " +
            "and JSONL fine-tune output formats. Billed per post and per " +
            "comment with no actor start fee.",
        docsUrl: "https://apify.com/leado/reddit-scraper-pro",
        categories: ["reddit"],
        notes: [
            "Billing: pay-per-event with $0 start fee — charged per " +
            "extracted post and per extracted comment (Business tier: " +
            "$0.0007/post, $0.00035/comment).",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path. */
    endpoint: "/leado/reddit-scraper-pro",
    request: {
        method: "POST",
        path: "/v2/acts/leado~reddit-scraper-pro/runs",
    },
    input: {
        schema: {
            // maxPostsPerSource is the PRIMARY limiting knob — required at
            // the binding (even though the actor publishes a default) so the
            // estimate is always deducible to price the hold (D24/D25).
            body: zRedditScraperProBody.required({
                maxPostsPerSource: true,
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough DOCUMENTATION.
    output: { schema: zRedditScraperProOutput },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                post: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "posts",
                    // vendor charge event: "post"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-11-20
                    consumes: { credit: "default", amount: 0.0007 },
                },
                comment: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "comments",
                    // vendor charge event: "comment"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-11-20
                    consumes: { credit: "default", amount: 0.00035 },
                },
            },
        },
        /** maxPostsPerSource (required at the binding) × non-post jobs, where
         *  subreddits + searchQueries (incl. searchQuery/keyword aliases)
         *  combine multiplicatively when both are given, plus non-post URLs
         *  (across urls, startUrls, and url aliases) and usernames. Direct
         *  post URLs (/comments/) yield 1 post and always fetch up to
         *  maxCommentsPerPost (default 10) comments even when includeComments
         *  is false. */
        estimate: ({ data, utils }) => {
            const body = data.input.body;
            const rawStartUrls = utils.json.optionalGet(body, "$.startUrls");
            const rawUrl = utils.json.optionalGet(body, "$.url");
            const allUrls = [
                ...(body.urls ?? []),
                ...(Array.isArray(rawStartUrls) ? rawStartUrls : []),
                ...(typeof rawUrl === "string" && rawUrl.trim()
                    ? [rawUrl]
                    : []),
            ];
            let directPostUrls = 0;
            let otherUrls = 0;
            for (const entry of allUrls) {
                const nestedUrl = entry !== null && typeof entry === "object"
                    ? utils.json.optionalGet(entry, "$.url")
                    : undefined;
                const u = typeof entry === "string"
                    ? entry
                    : typeof nestedUrl === "string"
                    ? nestedUrl
                    : "";
                if (!u.trim()) continue;
                if (
                    /reddit\.com\/(?:r\/[^/?#]+\/)?comments\/[a-z0-9]+/i.test(u)
                ) {
                    directPostUrls += 1;
                } else {
                    otherUrls += 1;
                }
            }
            const subCount = body.subreddits?.length ?? 0;
            const rawSearchQuery = utils.json.optionalGet(
                body,
                "$.searchQuery",
            );
            const rawKeyword = utils.json.optionalGet(body, "$.keyword");
            const queryCount = (body.searchQueries?.length ?? 0) +
                (typeof rawSearchQuery === "string" && rawSearchQuery.trim()
                    ? 1
                    : 0) +
                (typeof rawKeyword === "string" && rawKeyword.trim() ? 1 : 0);
            const userCount = body.usernames?.length ?? 0;
            const subQueryJobs = subCount > 0 && queryCount > 0
                ? subCount * queryCount
                : subCount + queryCount;
            const nonPostJobs = subQueryJobs + otherUrls + userCount;
            const effectiveNonPostJobs =
                nonPostJobs === 0 && directPostUrls === 0 ? 1 : nonPostJobs;
            const nonPostPosts = body.maxPostsPerSource * effectiveNonPostJobs;
            const posts = nonPostPosts + directPostUrls;
            const rawSkipComments = utils.json.optionalGet(
                body,
                "$.skipComments",
            );
            const includeComments = body.includeComments ??
                (typeof rawSkipComments === "boolean"
                    ? !rawSkipComments
                    : false);
            const rawMaxComments = utils.json.optionalGet(
                body,
                "$.maxComments",
            );
            const maxCommentsPerPost = body.maxCommentsPerPost ??
                (typeof rawMaxComments === "number" ? rawMaxComments : 10);
            const comments =
                (directPostUrls + (includeComments ? nonPostPosts : 0)) *
                maxCommentsPerPost;
            return { counts: { post: posts, comment: comments } };
        },
        /** OVERRIDES the provider evidence: splits dataset items into post
         *  and comment counts matching the actor's two charge events. */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const comments = rows.filter((row) =>
                utils.json.optionalGet(row, "$.type") === "comment"
            ).length;
            const posts = rows.length - comments;
            return { counts: { post: posts, comment: comments } };
        },
    },
});
