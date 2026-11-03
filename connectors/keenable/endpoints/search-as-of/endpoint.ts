import { defineEndpoint } from "@shared/core";
import {
    keenableSearchBodySchema,
    keenableSearchUsage,
} from "../../schema/search-binding.ts";

/**
 * Point-in-time preset over `POST /v1/search` — `query_time` is
 * required so discover can rank this doc for "historical search" and
 * "what was known before X". No competing search endpoint on Monid
 * documents this.
 *
 * PUBLIC identity is pinned (design D22): the vendor path is transport
 * plumbing shared with `/v1/search`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Point-in-Time Search",
        summary:
            "Search the web as it stood at a past moment, for evals and back-tests.",
        description: "Point-in-time web search over Keenable's own " +
            "index: query_time is required and searches the web as it " +
            "stood at that instant — pages acquired after it are " +
            "excluded — so evals, audits and back-tests get " +
            "reproducible results. Accepts YYYY-MM-DD, an ISO 8601 " +
            "timestamp, a Unix epoch in seconds as a string, or a " +
            "relative delta such as 7d (the answer as of 7 days ago, " +
            "not the last 7 days). Relative published_* / acquired_* " +
            "filters resolve against this instant instead of now. Each " +
            "result can carry a page-text extract of up to 10,000 " +
            "characters. A search with no results is not billed. Will " +
            "not: replay a historical Google SERP, or invent pages " +
            "Keenable had not indexed by that instant. Next: use " +
            "keenable#v1/search for a live-index search, or " +
            "keenable#v1/fetch for the full page as Markdown.",
        docsUrl: "https://docs.keenable.ai/api-reference/search",
        categories: ["web-search"],
        notes: [
            "Same credit as keenable#v1/search. query_time is required. " +
            "A search that returns no results is free.",
        ],
    },
    /** PUBLIC identity (design D22): shares upstream `POST /v1/search`. */
    endpoint: "/v1/search-as-of",
    request: { method: "POST", path: "/v1/search" },
    input: {
        schema: {
            body: keenableSearchBodySchema({ queryTimeRequired: true }),
        },
    },
    usage: keenableSearchUsage,
});
