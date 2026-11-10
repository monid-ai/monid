import { defineProvider, presets } from "@shared/core";

/**
 * String Web Access — web search, page reads and requests to a URL,
 * returned as clean, LLM-ready content. JSON-over-HTTP against
 * `https://request.usestring.ai/v1` with `Authorization: Bearer <key>`
 * (portal.usestring.ai/docs/get-started/authentication).
 *
 * The endpoints follow String's `/v3` tool surface
 * (portal.usestring.ai/docs/mcp/v3): each one does one kind of thing, so
 * what a call can change is plain from which endpoint it is.
 * `string#search` and `string#fetch` only read; `string#request` sends a
 * POST, PUT or PATCH and is the one endpoint that can change data on
 * another site. `/v3`'s three sitemap tools are left for a later PR: a
 * crawl is priced per page at the rate in its own quote, and no flat
 * per-page rate is published to pin a rate card to.
 *
 * Sourced entirely from String's own public docs, not third-party
 * reverse engineering — String is our own product, so the docs are
 * authoritative here.
 *
 * Priced at the Growth-tier rate — $1.00/1,000 searches, $0.20-$4.00/1,000
 * fetches by billed class — per portal.usestring.ai/docs/get-started/
 * pricing (retrieved 2026-10-24); see each endpoint file for the per-unit
 * breakdown.
 */
export default defineProvider({
    name: "string",
    meta: {
        displayName: "String Web Access",
        summary: "Search the web, fetch any URL or send it a request, as " +
            "clean, LLM-ready content.",
        description: "Search the web, fetch any URL or send it a " +
            "request, all returned as clean, LLM-ready content. Search " +
            "answers with Google's ranked results and the rest of the " +
            "results page beside them, or with Google AI Mode's answer " +
            "and the pages it cites. Fetch reads a page with a GET and " +
            "returns it as Markdown. Request sends a POST, PUT or PATCH " +
            "with a body, and is the only endpoint here that can change " +
            "data on another site.",
        homepageUrl: "https://usestring.ai",
        docsUrl: "https://portal.usestring.ai/docs/api-reference/overview",
        categories: ["web-search", "web-scraping"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://request.usestring.ai/v1" },
    // Google paging can run String's own documented 45-second search
    // budget before returning a still-200 partial result (see
    // "Result count and paging" on the /search docs page).
    timeouts: { requestMs: 50_000, runMs: 55_000 },
    usage: {
        // String bills in plan-tier USD, not a vendor "credits" unit, and
        // exposes no consolidate-able receipt on the response — quoted
        // here at the Growth-tier rate.
        credits: {
            default: {
                label: "US dollars (Growth-tier rate)",
            },
        },
    },
});
