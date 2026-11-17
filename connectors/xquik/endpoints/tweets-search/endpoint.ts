import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTweetSearchQueryParams } from "./schema/inputs.ts";

/** GET /x/tweets/search, X (Twitter) tweet search. */
export default defineEndpoint({
    meta: {
        displayName: "Search X (Twitter) Tweets",
        summary: "Search X (Twitter) tweets by keyword, account, date & " +
            "engagement.",
        description: "Search X (Twitter) tweets with X search operators " +
            "or plain filters. Filter by account, date, language, media, " +
            "likes, reposts & replies. Each tweet carries its author, " +
            "counts, media, links & URL. Results include tweets X's own " +
            "search tab leaves out. Large date ranges come back whole. " +
            "Use xquik#x/users/{id}/tweets for 1 account's timeline.",
        docsUrl: "https://docs.xquik.com/api-reference/x/search-tweets",
        categories: ["twitter"],
        notes: [
            "q is optional when fromUser, exactPhrase or another filter " +
            "forms the search. With none of them, Xquik answers 400 " +
            "missing_query.",
        ],
    },
    request: { method: "GET", path: "/x/tweets/search" },
    input: {
        schema: {
            queryParams: zTweetSearchQueryParams.extend({
                limit: zTweetSearchQueryParams.shape.limit.unwrap()
                    .default(20),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "tweets",
            description: "tweets returned",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.queryParams.limit },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.optionalGet(
                        data.lifecycle?.state ?? null,
                        "$.data.creditsCharged",
                    ) === 0
                    ? 0
                    : utils.json.len(data.output, "$.tweets"),
            },
        }),
    },
});
