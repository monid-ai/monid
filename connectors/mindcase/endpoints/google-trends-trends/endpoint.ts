import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleTrendsTrendsBody } from "./schema/inputs.ts";

/**
 * Mindcase `google-trends/trends`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Trends",
        summary: "Google Trends search interest for a keyword, with interest " +
            "over time and interest by region for the geography and time " +
            "range you choose.",
        description:
            "Google Trends search interest for a keyword, with interest " +
            "over time and interest by region for the geography and time " +
            "range you choose. Returns one row per trend with queryId, " +
            "keyword, geo, timeRange, trendsUrl, interestOverTime, " +
            "interestByRegion, relatedQueries. For live search results " +
            "use mindcase#google/search. $0.0045 per trend; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google-trends/trends",
        categories: ["seo"],
    },
    endpoint: "/google-trends/trends",
    request: { method: "POST", path: "/v1/data/google-trends/trends/run" },
    input: {
        schema: {
            body: zGoogleTrendsTrendsBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0045 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.queries.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
