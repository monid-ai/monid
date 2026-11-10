import { defineEndpoint } from "@shared/core";
import {
    keenableSearchBodySchema,
    keenableSearchUsage,
} from "../../schema/search-binding.ts";

/**
 * Scholarly-paper preset over `POST /v1/search` — same wire and
 * billing as `keenable#v1/search`, ranked under `academic-search` so
 * discover can send "research paper" / "arxiv" jobs here instead of
 * a neural search with category `research paper`. Long extracts
 * default on (snippet_max_length 10000) so abstracts and page text
 * arrive in the same call.
 *
 * PUBLIC identity is pinned (design D22): the vendor path is transport
 * plumbing shared with `/v1/search`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Paper Search",
        summary:
            "Search scholarly papers and read abstracts or page text in one call.",
        description: "Scholarly web search over Keenable's own " +
            "index. Phrase the query as the paper you want (title, " +
            "authors, or topic). Add site to stay on a corpus — " +
            "arxiv.org, aclanthology.org, pubmed.ncbi.nlm.nih.gov, " +
            "openreview.net — or omit it to search the open web " +
            "for PDFs and publisher pages. snippet_max_length " +
            "defaults to 10000 so the abstract or page extract " +
            "comes back with the URL, at $0.001, with no second " +
            "contents hop. Filter by published_after for a year " +
            "window. A search with no results is not billed. Will " +
            "not: return a citation graph, author profiles, or " +
            "venue-normalized metadata. Next: keenable#v1/fetch " +
            "for the full PDF or HTML as Markdown; " +
            "keenable#v1/search for an unscoped web search.",
        docsUrl: "https://docs.keenable.ai/api-reference/search",
        categories: ["academic-search"],
        notes: [
            "Same $0.001 volume rate as keenable#v1/search. " +
            "snippet_max_length defaults to 10000; a search that " +
            "returns no results is free.",
        ],
    },
    /** PUBLIC identity (design D22): shares upstream `POST /v1/search`. */
    endpoint: "/v1/search-papers",
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
