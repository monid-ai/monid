import { defineProvider, presets } from "@shared/core";

/**
 * Telnyx Web Search (telnyx.com/products/web-search-api) — one synchronous
 * search endpoint for AI agents against
 * `https://api.telnyx.com/v2` (OpenAPI server, spec 2.0.0), auth
 * `Authorization: Bearer <key>` — the same key as every other Telnyx API.
 *
 * Billing: Telnyx publishes "$5 per 1,000 calls" for search
 * (https://telnyx.com/products/web-search-api FAQ, checked 2026-10-22)
 * ⇒ $0.005 per search, US-dollar pool. No separate livecrawl price is
 * published. REST responses carry no cost receipt, so there is no
 * `usage.consolidate` and the derived fold settles (keenable/search1api
 * posture).
 */
export default defineProvider({
    name: "telnyx",
    meta: {
        displayName: "Telnyx",
        summary: "Web search for AI agents.",
        description: "Web search for AI " +
            "agents, billed through a Telnyx account — ranked web (and " +
            "occasionally news) results with titles, descriptions, and " +
            "snippets, filterable by domain, country, freshness, and " +
            "safe-search level.",
        homepageUrl: "https://telnyx.com/products/web-search-api",
        docsUrl: "https://developers.telnyx.com/docs/web-search",
        categories: ["web-search"],
        notes: [
            "Responses carry no cost receipt; the pinned card settles.",
            "The API reference states 60 requests/minute per key; " +
            "observed gateway headers advertise 2000 per second.",
        ],
    },
    auth: {
        inject: presets.auth.bearer(),
        // credentials omitted → default { apiKey: non-empty string } (§sections/auth.ts)
    },
    request: { baseUrl: "https://api.telnyx.com/v2" },
    // Recorded searches on 2026-10-22 took 0.8–2.1 s (livecrawl 1.9 s).
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26): Telnyx publishes a $ price, so
         *  the pool is US dollars (exa posture). No `consolidate`: no
         *  response body carries a receipt. */
        credits: { default: { label: "US dollars" } },
    },
});
