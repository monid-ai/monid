import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRedditScraperBody } from "./schema/inputs.ts";
import { zRedditScraperOutput } from "./schema/output.ts";

/**
 * benthepythondev/reddit-scraper — Reddit posts and comments.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence, rows → the sole metered line) is inherited from the
 * apify provider; the actorId is baked into the start path.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull Reddit Posts and Comment Threads",
        summary: "Reddit posts from a subreddit, user, search or post link, " +
            "with full comment trees, as Markdown, HTML or plain text.",
        description: "Reads Reddit through its own data API, no login: a " +
            "subreddit's feed (hot, new, top, rising, controversial, with a " +
            "time range and a since-date), a user's posts, a search " +
            "(optionally inside one subreddit), or one post by link with " +
            "its whole comment tree, including the 'load more' and " +
            "'continue this thread' branches. Posts and comments are " +
            "separate rows; post text comes as Markdown, HTML or plain " +
            "text. deepScrape reads the other orders and time ranges of a " +
            "subreddit or search to pass Reddit's ~950-post (~240 for " +
            "search) list end. Rows are capped by maxPosts and maxComments. " +
            "Alternatives: apify#trudax/reddit-scraper-lite, " +
            "apify#practicaltools/apify-reddit-api.",
        docsUrl: "https://apify.com/benthepythondev/reddit-scraper",
        categories: ["reddit"],
        notes: [
            "The watch inputs (onlyNew, watchName) keep a memory in the " +
            "account that runs the actor and are not offered here: every " +
            "caller would share one memory.",
            "Comment rows are billed like post rows; the estimate holds " +
            "maxComments per post when comments are read (post mode, or " +
            "includeComments).",
        ],
    },
    endpoint: "/benthepythondev/reddit-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/benthepythondev~reddit-scraper/runs",
    },
    timeouts: { runMs: 600_000 },
    input: {
        schema: {
            // maxPosts is the PRIMARY limiting knob — required; 0 means
            // unlimited in the actor for both caps, so the binding floors
            // them at 1 (D25); maxComments keeps the actor's default 50
            body: zRedditScraperBody
                .omit({ onlyNew: true, watchName: true, debugMode: true })
                .extend({
                    maxPosts: zRedditScraperBody.shape.maxPosts.unwrap()
                        .min(1),
                    maxComments: zRedditScraperBody.shape.maxComments
                        .unwrap().min(1).default(50),
                }),
        },
    },
    output: { schema: zRedditScraperOutput },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "actor start",
                    // vendor charge event: "apify-actor-start", one per
                    // started GB; the actor runs at 512 MB → one event
                    consumes: { credit: "default", amount: 0.00004 },
                },
                default_dataset_item: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "posts and comments",
                    // vendor charge event: "apify-default-dataset-item"
                    consumes: { credit: "default", amount: 0.0024 },
                },
            },
        },
        /** post mode: one post plus its comments; other modes: maxPosts
         *  posts, each with up to maxComments comments when
         *  includeComments is on. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const posts = body.mode === "post" ? 1 : body.maxPosts;
            const comments = body.mode === "post" || body.includeComments
                ? body.maxComments
                : 0;
            return {
                counts: { default_dataset_item: posts * (1 + comments) },
            };
        },
    },
});
