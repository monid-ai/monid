import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTwitterTrendsBody } from "./schema/inputs.ts";

/**
 * Mindcase `twitter/trends`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Twitter Trends",
        summary: "Trending topics on X (Twitter) with rank, URL and hashtag " +
            "and promoted flags. Pick worldwide, a country or a major " +
            "city.",
        description:
            "Trending topics on X (Twitter) with rank, URL and hashtag " +
            "and promoted flags. Pick worldwide, a country or a major " +
            "city. Returns one row per trend with trendKey, rank, trend, " +
            "trendUrl, isHashtag, isPromoted, location, locationType, " +
            "countryCode, woeid, requestedLocation, asOf. For tweets on a " +
            "trend use mindcase#twitter/tweets. $0.001 per trend; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/twitter/trends",
        categories: ["twitter"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/twitter/trends",
    request: { method: "POST", path: "/v1/data/twitter/trends/run" },
    input: {
        schema: {
            body: zTwitterTrendsBody.extend({
                maxResults: zTwitterTrendsBody.shape.maxResults.unwrap().min(1)
                    .default(50).describe(
                        "How many trends to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
