import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zV2DataEventSummaryQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Keyword Event Summaries (v2)",
        summary:
            "Written summaries of what happened around keywords, with source posts.",
        description: "Written summaries of what happened around up to five " +
            "comma-separated keywords within a time window (default 7d), " +
            "each with the post ids and links it was built from. For " +
            "structured events already analyzed per asset, use " +
            "elfa#v3/events; to search them by topic, pass `q` there.",
        docsUrl: "https://docs.elfa.ai/api/v2/endpoints/event-summary",
        categories: ["crypto-signals", "news-search"],
        notes: [
            "5 credits per request.",
            "A 503 means the matched posts could not be summarized; " +
            "retry, or narrow the keywords or the time window.",
        ],
    },
    request: { method: "GET", path: "/v2/data/event-summary" },
    timeouts: { requestMs: 180_000, runMs: 180_000 },
    input: {
        schema: {
            queryParams: zV2DataEventSummaryQueryParams.extend({
                timeWindow: zV2DataEventSummaryQueryParams.shape.timeWindow
                    .unwrap().default("7d"),
                searchType: zV2DataEventSummaryQueryParams.shape.searchType
                    .unwrap().default("or"),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 5 },
        },
    },
});
