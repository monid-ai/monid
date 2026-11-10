import { defineEndpoint } from "@shared/core";
import {
    keenableSearchBodySchema,
    keenableSearchUsage,
} from "../../schema/search-binding.ts";

/**
 * Search-and-read preset over `POST /v1/search` — same wire, billing
 * and result shape as `keenable#v1/search`, with `snippet_max_length`
 * defaulting to 10000 so discover can rank this doc for "search the
 * live web and read the pages in one call" (the Exa `/search` +
 * `contents` job, at the volume rate).
 *
 * PUBLIC identity is pinned (design D22): the vendor path is transport
 * plumbing shared with `/v1/search`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Search and Read",
        summary:
            "Search the live web and read the top pages in one call; long extracts included.",
        description: "Search-and-read over Keenable's own 100B+ page " +
            "index: one $0.001 call returns ranked URLs plus a " +
            "page-text extract of up to 10,000 characters on each " +
            "result. snippet_max_length defaults to 10000 so the " +
            "agent gets live-web context without a second contents " +
            "or fetch hop. Phrase the query as a description of the " +
            "page you want. Up to 50 results. Filter by site, " +
            "publish date, or index date. A search with no results " +
            "is not billed. Will not: synthesize a structured " +
            "object across sources, or reproduce a Google SERP. " +
            "Next: keenable#v1/fetch only when a single page must " +
            "be read in full Markdown; keenable#v1/search for a " +
            "shorter default snippet.",
        docsUrl: "https://docs.keenable.ai/api-reference/search",
        categories: ["web-search", "web-extraction"],
        notes: [
            "Same $0.001 volume rate as keenable#v1/search. " +
            "snippet_max_length defaults to 10000; a search that " +
            "returns no results is free.",
        ],
    },
    /** PUBLIC identity (design D22): shares upstream `POST /v1/search`. */
    endpoint: "/v1/search-contents",
    request: { method: "POST", path: "/v1/search" },
    input: {
        schema: {
            body: keenableSearchBodySchema({
                snippetMaxLengthDefault: 10000,
            }),
        },
    },
    usage: keenableSearchUsage,
});
