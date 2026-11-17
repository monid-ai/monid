import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zToutiaoTrendingBody } from "./schema/inputs.ts";

/**
 * Mindcase `toutiao/trending`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Toutiao Trending",
        summary: "Trending topics on Toutiao with rank, title, hot value, " +
            "category, label and URL.",
        description:
            "Trending topics on Toutiao with rank, title, hot value, " +
            "category, label and URL. Returns one row per topic with " +
            "topicId, rank, title, hotValue, url, category, label, " +
            "imageUrl, capturedAt. $0.002 per topic; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/toutiao/trending",
        categories: ["news-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/toutiao/trending",
    request: { method: "POST", path: "/v1/data/toutiao/trending/run" },
    input: {
        schema: {
            body: zToutiaoTrendingBody.extend({
                maxResults: zToutiaoTrendingBody.shape.maxResults.unwrap().min(
                    1,
                ).default(100).describe("How many topics to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
