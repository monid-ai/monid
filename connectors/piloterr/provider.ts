import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Piloterr (www.piloterr.com). Synchronous GET endpoints against
 * `https://api.piloterr.com`, auth the `x-api-key` header.
 *
 * Billing: Piloterr bills credits per successful request: the crawler 1
 * credit, rendering 2 credits, technology detection 1 credit (published
 * pricing; measured in the Treg catalog run, 2026-11-09). No response
 * carries a usage receipt, so the derived fold settles.
 */
export default defineProvider({
    name: "piloterr",
    meta: {
        displayName: "Piloterr",
        summary:
            "Fetch any public web page as HTML, with JavaScript rendering, and detect its technologies.",
        description:
            "A web scraping API: fetch the HTML of any public page over plain " +
            "HTTP or in a headless browser that runs its JavaScript, with " +
            "proxies and retries handled by Piloterr, and detect the " +
            "technologies a website runs. Use it when an agent needs the page " +
            "itself rather than a search snippet.",
        homepageUrl: "https://www.piloterr.com",
        docsUrl: "https://docs.piloterr.com",
        categories: ["web-scraping", "web-extraction"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.piloterr.com" },
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        /** THE credit system (design D26): one pool, the vendor's own
         *  credits. No `consolidate`: no response carries a receipt. */
        credits: { default: { label: "Piloterr credits" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
