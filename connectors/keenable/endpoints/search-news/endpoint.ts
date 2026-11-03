import { defineEndpoint } from "@shared/core";
import {
    keenableSearchBodySchema,
    keenableSearchUsage,
} from "../../schema/search-binding.ts";

/**
 * News preset over `POST /v1/search` — same wire, billing and result
 * shape as `keenable#v1/search`, with `published_after` defaulting to
 * `2d` so discover can rank this doc for "search the news".
 *
 * PUBLIC identity is pinned (design D22): the vendor path is transport
 * plumbing shared with `/v1/search`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable News Search",
        summary:
            "Search recent news; each result carries a long page-text extract.",
        description: "News-oriented web search over Keenable's own " +
            '100B+ page index. published_after defaults to "2d" so ' +
            "one call covers the last two days of coverage; override " +
            "it with a date, timestamp, or relative value (7d, 24h). " +
            "Each result can carry a page-text extract of up to 10,000 " +
            "characters, so many news questions are answered without a " +
            "separate fetch. Filter further by site or published_before. " +
            "A search with no results is not billed. Will not: " +
            "reproduce a Google News SERP, or return paywalled body " +
            "text. Next: pass result URLs to keenable#v1/fetch for the " +
            "full page as Markdown, or keenable#v1/search for an " +
            "unscoped web search.",
        docsUrl: "https://docs.keenable.ai/api-reference/search",
        categories: ["news-search"],
        notes: [
            "Same credit as keenable#v1/search. published_after defaults " +
            "to 2d; a search that returns no results is free.",
        ],
    },
    /** PUBLIC identity (design D22): shares upstream `POST /v1/search`. */
    endpoint: "/v1/search-news",
    request: { method: "POST", path: "/v1/search" },
    input: {
        schema: {
            body: keenableSearchBodySchema({ publishedAfterDefault: "2d" }),
        },
    },
    usage: keenableSearchUsage,
});
