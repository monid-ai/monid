import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zNewsSearchBody } from "./schema/inputs.ts";

/** POST /news-search — cross-source news as storylines and claims. */
export default defineEndpoint({
    meta: {
        displayName: "Search Company and Market News",
        summary: "Search news as deduplicated storylines, events and " +
            "attributed claims, with links to the source articles.",
        description: "Search company and market news across sources. " +
            "Reports of the same occurrence are merged into one event and " +
            "related events are grouped into a storyline, so each item in " +
            "`results` is a storyline, not an article: story_id, title, " +
            "summary, first_seen_at, last_seen_at, tags (primary_class, " +
            "event_types, regions, GICS sectors) and its events, each " +
            "with time_event, summary, event_type, the entities involved, " +
            "sources_total and one source {name, url, time, headline}. " +
            "Statements with a named speaker and subject come back " +
            "separately in `claims`. Summaries are written by drillr; " +
            "article text is not included. Covers the US, China and " +
            "Japan. Passing only `ticker` or a time window with " +
            "`order_by` `create_time` gives a latest-news feed for a " +
            "company.",
        docsUrl: "https://drillr.ai/docs/api/news-search",
        categories: ["news-search", "company-news", "equities"],
        notes: [
            "At least one of `query`, `theme`, `ticker`, `since`, `until` " +
            "is required; a body with none of them is rejected upstream.",
            "Most macroeconomic, political and geopolitical events are " +
            "not linked to a company. Search for them with `query`, " +
            "`theme` or a time window rather than `ticker` alone.",
            "The response is not wrapped in `data`: the storylines are " +
            "under `results` and the claims under `claims`, beside the " +
            "echoed filters, `count` and `next_cursor`.",
            "`theme` cannot be combined with `search_type` `claims`. " +
            "With `search_type` `all`, `claims_skipped` says why claims " +
            "were left out when a filter cannot apply to them.",
            "When a `theme` falls below the match threshold, " +
            "`theme_resolved.matched` is false and no storylines are " +
            "returned.",
        ],
    },
    request: { method: "POST", path: "/news-search" },
    input: { schema: { body: zNewsSearchBody } },
    usage: {
        /** 0.2 credits per call — REST card "/news-search 0.2 cr /
         *  call", the same price as the MCP tool `news_search`. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "search",
            consumes: { credit: "default", amount: 0.2 },
        },
    },
});
