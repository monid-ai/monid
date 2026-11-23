import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zV2DataTrendingNarrativesQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Trending Narratives (v2)",
        summary: "Narratives trending on crypto X today or this week.",
        description:
            "Narratives trending across crypto X over the last day or " +
            "week, each written up with example posts. Can take tens of " +
            "seconds when nothing is cached. For the structured " +
            "equivalent with ids and per-asset filters, use " +
            "elfa#v3/events/arcs.",
        docsUrl: "https://docs.elfa.ai/api/v2/endpoints/trending-narratives",
        categories: ["crypto-signals", "twitter"],
        notes: [
            "5 credits per request.",
            "An empty result costs 1 credit, not 5.",
        ],
    },
    request: { method: "GET", path: "/v2/data/trending-narratives" },
    timeouts: { requestMs: 180_000, runMs: 180_000 },
    input: {
        schema: {
            queryParams: zV2DataTrendingNarrativesQueryParams.extend({
                timeFrame: zV2DataTrendingNarrativesQueryParams.shape.timeFrame
                    .unwrap().default("day"),
                maxNarratives: zV2DataTrendingNarrativesQueryParams.shape
                    .maxNarratives.unwrap().default(7),
                maxTweetsPerNarrative: zV2DataTrendingNarrativesQueryParams
                    .shape.maxTweetsPerNarrative.unwrap().default(5),
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
