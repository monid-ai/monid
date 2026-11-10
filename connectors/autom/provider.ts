import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Autom (www.autom.dev). Synchronous GET endpoints against
 * `https://api.autom.dev`, auth the `x-api-key` header.
 *
 * Billing: Autom bills 1 credit per successful request, whatever the
 * engine (published pricing; measured in the Treg catalog run,
 * 2026-11-09). Failed requests are free. No response carries a usage
 * receipt, so there is no `usage.consolidate` and the derived fold
 * settles.
 */
export default defineProvider({
    name: "autom",
    meta: {
        displayName: "Autom",
        summary:
            "Live Google, Google News, Brave, DuckDuckGo and Yahoo results as structured JSON.",
        description: "A SERP API: run a query on Google, Google News, Brave, " +
            "DuckDuckGo or Yahoo, from a chosen country and language, and get " +
            "the live results page as structured JSON — organic results with " +
            "title, link, domain and snippet. Use it when an agent needs " +
            "fresh search results rather than a model's memory.",
        homepageUrl: "https://www.autom.dev",
        docsUrl: "https://docs.autom.dev",
        categories: ["web-search", "news-search"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.autom.dev" },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** THE credit system (design D26): one pool, the vendor's own
         *  credits. No `consolidate`: no response carries a receipt. */
        credits: { default: { label: "Autom credits" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
