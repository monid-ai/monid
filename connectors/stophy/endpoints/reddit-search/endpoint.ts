import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRedditSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/reddit/search` — Reddit posts, subreddits or users for a
 * query. 1 unit per call, billed only when `results` is non-empty ⇒ leaf
 * PER_UNIT counted off the response.
 */
export default defineEndpoint({
    meta: {
        displayName: "Stophy Reddit Search",
        summary: "Search Reddit posts, subreddits or users.",
        description: "Search Reddit and get posts (`postId`, `postUrl`, " +
            "`title`, `text`, `subreddit`, `authorUsername`, `score`, " +
            "`upvotePercent`, `comments`, `publishedAt`), or subreddits " +
            "or users with `type`. Narrow with `subreddit`, `sort` and " +
            "`time`. With a sort other than relevance, a query of several " +
            "words matches that exact phrase. Page by sending back the " +
            "response's `cursor`. Best for discussion and opinions.",
        docsUrl: "https://docs.stophy.dev/api-reference/endpoint/reddit-search",
        categories: ["reddit"],
        notes: [
            "1 Stophy call when results come back; an empty answer is free.",
        ],
    },
    request: { method: "POST", path: "/reddit/search" },
    input: { schema: { body: zRedditSearchBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "searches with results",
            description: "one call that returned at least one result",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Bills only when `results` is non-empty — Stophy charges nothing
         *  for an empty answer. */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalGet(
                data.output,
                "$.data.results",
            );
            return {
                counts: {
                    RESULT: Array.isArray(results) && results.length > 0
                        ? 1
                        : 0,
                },
            };
        },
    },
});
