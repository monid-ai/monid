import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zHackernewsStoriesBody } from "./schema/inputs.ts";

/**
 * Mindcase `hackernews/stories`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Hacker News Stories",
        summary:
            "Hacker News stories with rank, title, link, body and author " +
            "from the top, new, best, ask or show feed, or search by " +
            "keyword.",
        description:
            "Hacker News stories with rank, title, link, body and author " +
            "from the top, new, best, ask or show feed, or search by " +
            "keyword. Returns one row per storie with hnId, hnUrl, rank, " +
            "title, externalLink, body, author, points, commentCount, " +
            "posted. $0.01 per storie; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/hackernews/stories",
        categories: ["news-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/hackernews/stories",
    request: { method: "POST", path: "/v1/data/hackernews/stories/run" },
    input: {
        schema: {
            body: zHackernewsStoriesBody.extend({
                maxResults: zHackernewsStoriesBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many stories to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
