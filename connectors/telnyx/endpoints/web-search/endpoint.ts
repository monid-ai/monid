import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTelnyxWebSearchBody } from "./schema/inputs.ts";

/**
 * POST /web_search — web search.
 *
 * $0.005 per search ("$5 per 1,000 calls",
 * https://telnyx.com/products/web-search-api FAQ, checked 2026-10-22),
 * billed only when `data.results.web` is non-empty: Telnyx prices per call,
 * so an empty search is still an upstream call, which Monid absorbs
 * (search1api #40; keenable "searches with results").
 */
export default defineEndpoint({
    meta: {
        displayName: "Telnyx Web Search",
        summary: "Search the web and get ranked results with snippets.",
        description: "Search the web and return ranked results, each " +
            "with title, URL, description, and text snippets (plus " +
            "thumbnail and favicon URLs when available). Results are under " +
            "`data.results.web`; some queries also surface " +
            "`data.results.news`. Filter by included or excluded domains, " +
            "bias by country, restrict by freshness (day/week/month/year), " +
            "set a safe-search level, cap the count (1–100), or crawl " +
            "pages live for fresher content. Returns snippets, not full " +
            "page text.",
        docsUrl: "https://developers.telnyx.com/docs/web-search",
        categories: ["web-search"],
        notes: [
            "The local engine does not automatically retry this POST. " +
            "Transport failures are marked retriable, but replay may " +
            "duplicate a provider charge after an ambiguous failure.",
            "Input validation enforces documented types and bounds, not " +
            "ISO country membership or hostname syntax. Freshness is a " +
            "free-form string, not an enum. No count default is injected.",
            "include_domains and exclude_domains are mutually exclusive; " +
            "sending both is a 400.",
            "`data.results.news` is absent, not empty, for most queries.",
            "After a livecrawl 504, a caller may retry with livecrawl false; " +
            "a retry is another provider request and may incur another charge.",
            "Billed $0.005 per search that returns at least one web " +
            "result, not per result. Empty and error responses bill 0.",
            "livecrawl is billed at the same per-search rate; Telnyx " +
            "publishes no separate livecrawl price.",
        ],
    },
    request: { method: "POST", path: "/web_search" },
    input: { schema: { body: zTelnyxWebSearchBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "searches with results",
            description: "searches whose response carried at least one " +
                "web result",
            consumes: { credit: "default", amount: 0.005 },
        },
        /** The hold promises one search. */
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Missing/malformed meters must not masquerade as empty searches. */
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.len(data.output, "$.data.results.web") > 0
                    ? 1
                    : 0,
            },
        }),
    },
});
