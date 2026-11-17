import { defineEndpoint } from "@shared/core";
import { zValyuSearchBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Valyu Search",
        summary: "Search web, news, academic, and proprietary sources.",
        description:
            "Search with a natural-language query and receive ranked " +
            "results with source URLs, extracted content, relevance scores, " +
            "and source metadata. Filter by datasets or domains, publication " +
            "dates, and country; use fast_mode for web-only low-latency " +
            "retrieval or historical_cache for point-in-time searches.",
        docsUrl: "https://docs.valyu.ai/api-reference/endpoint/search",
        categories: ["web-search", "news-search"],
        notes: [
            "Source-dependent CPM pricing: the pre-run estimate is empty " +
            "(no price quote or hold), NOT a free search. Actual USD cost " +
            "comes from total_deduction_dollars or per-result prices.",
            "max_price limits CPM, not total spend. Most proprietary " +
            "sources require a subscription. The standard result cap is 20.",
            "ISO date-times require historical_cache: true. Valyu " +
            "validates cross-field combinations such as fast_mode and url_only.",
        ],
    },
    request: { method: "POST", path: "/v1/search" },
    input: {
        schema: {
            body: zValyuSearchBody.extend({
                query: zValyuSearchBody.shape.query.min(1),
            }),
        },
    },
    usage: {
        // No documented total budget or input-derived quote exists for
        // source-dependent retrieval. Do not turn a CPM ceiling into dollars.
        estimate: () => ({ counts: {} }),
    },
});
