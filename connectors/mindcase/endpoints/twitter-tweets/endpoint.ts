import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTwitterTweetsBody } from "./schema/inputs.ts";

/**
 * Mindcase `twitter/tweets`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Twitter / X Tweets",
        summary: "Extract tweets from Twitter (X) by handle, search keyword, " +
            "or tweet URL, with full text, date, media, quoted/retweeted " +
            "content, and all engagement metrics.",
        description:
            "Extract tweets from Twitter (X) by handle, search keyword, " +
            "or tweet URL, with full text, date, media, quoted/retweeted " +
            "content, and all engagement metrics. Returns one row per " +
            "tweet with tweetUrl, tweetId, tweetText, postedDate, " +
            "language, conversationId, views, likes, retweets, replies, " +
            "quotes, bookmarks, isReply, isQuote, isPinned, " +
            "repliesRestricted, replyToHandle, replyToTweetUrl, " +
            "retweetedTweetUrl, retweetedTweetText, originalPostDate, " +
            "quotedTweetUrl, quotedTweetText, hashtags, mentions, " +
            "outboundLinks, cashtags, linkCardTitle, linkCardDescription, " +
            "linkCardDomain and 5 more fields. Call it by handle / tweet " +
            "url (inputs) or search (query). For replies under one tweet " +
            "use mindcase#twitter/replies; for who retweeted use " +
            "mindcase#twitter/retweeters; for account data use " +
            "mindcase#twitter/profiles. $0.00025 per tweet; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/twitter/tweets",
        categories: ["twitter"],
        notes: [
            "Adds a flat $0.003 search fee per run that uses `query`, " +
            "charged even when nothing is found.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/twitter/tweets",
    request: { method: "POST", path: "/v1/data/twitter/tweets/run" },
    input: {
        schema: {
            body: zTwitterTweetsBody.extend({
                maxResults: zTwitterTweetsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Maximum number of tweets to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                row: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "tweets",
                    description: "tweets returned",
                    consumes: { credit: "default", amount: 0.00025 },
                },
                search_search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search fee",
                    description:
                        "one flat fee per search run, charged even when nothing is found",
                    consumes: { credit: "default", amount: 0.003 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return {
                counts: {
                    row: rows,
                    search_search:
                        ((body.query ?? "").split("\n").filter((line: string) =>
                                line.trim() !== ""
                            ).length) > 0
                            ? 1
                            : 0,
                },
            };
        },
        evidence: ({ data, utils }) => {
            const input = (data.input.body ?? {}) as Record<string, unknown>;
            // deno-lint-ignore no-explicit-any
            const body = (input.params ?? input) as any;
            const delivered = utils.json.optionalLen(data.output, "$.data") ??
                0;
            return {
                counts: {
                    row: delivered,
                    search_search:
                        ((body.query ?? "").split("\n").filter((line: string) =>
                                line.trim() !== ""
                            ).length) > 0
                            ? 1
                            : 0,
                },
            };
        },
    },
});
