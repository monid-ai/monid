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
        /** maxPostsPerSource (required at the binding) × jobs, where
         *  subreddits + searchQueries combine multiplicatively when both are
         *  given, plus urls and usernames. Comments scale by
         *  maxCommentsPerPost (default 10) when includeComments is true. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const subCount = body.subreddits?.length ?? 0;
            const queryCount = body.searchQueries?.length ?? 0;
            const urlCount = body.urls?.length ?? 0;
            const userCount = body.usernames?.length ?? 0;
            const subQueryJobs = subCount > 0 && queryCount > 0
                ? subCount * queryCount
                : subCount + queryCount;
            const jobs = subQueryJobs + urlCount + userCount;
            const posts = body.maxPostsPerSource * jobs;
            const comments = body.includeComments
                ? posts * (body.maxCommentsPerPost ?? 10)
                : 0;
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
