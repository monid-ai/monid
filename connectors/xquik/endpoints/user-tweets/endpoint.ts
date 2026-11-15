import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import {
    zUserTweetsPathParams,
    zUserTweetsQueryParams,
} from "./schema/inputs.ts";

/** GET /x/users/{id}/tweets, 1 account's X (Twitter) timeline. */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) User Tweets",
        summary: "List an X (Twitter) account's tweets, newest first.",
        description: "List the tweets 1 X (Twitter) account posted, " +
            "newest first. The first page opens with the pinned tweet, " +
            "flagged isPinned. Pages reach the account's oldest tweets. " +
            "Filter by date, media, engagement & reposts. Send sinceId " +
            "to read only tweets newer than one you hold. Each tweet " +
            "carries its author, counts, media, links & URL. Use " +
            "xquik#x/tweets/search to search across accounts.",
        docsUrl: "https://docs.xquik.com/api-reference/x/user-tweets",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/x/users/{id}/tweets" },
    input: {
        schema: {
            pathParams: zUserTweetsPathParams.extend({
                // A bare search or batch would route to Xquik's own
                // search/batch reads instead of this lookup.
                id: zUserTweetsPathParams.shape.id.regex(
                    /^(?!(?:search|batch)$)/,
                )
                    .describe(
                        "User ID, username with or without @, or profile URL such as " +
                            "x.com/nasa. A number reads as a user ID. Write " +
                            "@search or @batch for accounts with those names.",
                    ),
            }),
            queryParams: zUserTweetsQueryParams.extend({
                pageSize: zUserTweetsQueryParams.shape.pageSize.unwrap()
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
            counts: { RESULT: data.input.queryParams.pageSize },
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
