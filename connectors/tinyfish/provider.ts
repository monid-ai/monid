import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * TinyFish (tinyfish.ai) — three products on three hosts:
 *
 *   - Search (`api.search.tinyfish.ai`) and Fetch (`api.fetch.tinyfish.ai`):
 *     FREE on every plan (plans differ on rate limit, not price). Each
 *     declares its own `request.baseUrl`.
 *   - The Agent API and Browser Context Profiles (`agent.tinyfish.ai`): the
 *     PROVIDER baseUrl. Resource ops always target the provider origin
 *     (they carry no request section), so the `browser-profile` resource
 *     pins it here.
 *
 * The Browser API (`api.browser.tinyfish.ai`, raw CDP sessions billed per
 * minute) is NOT ported yet: its session resource would need a second
 * resource origin, which the contract does not express today.
 *
 * Usage: FREE stays the provider default (search, fetch, the profile
 * endpoints). The agent run is the one billed doc and drains the `default`
 * pool — TinyFish prices it in US dollars: $0.016 per AI step, drawn from a
 * prepaid wallet (https://www.tinyfish.ai/pricing, checked 2026-10-22).
 */
export default defineProvider({
    name: "tinyfish",
    meta: {
        displayName: "TinyFish",
        summary: "Live-web search, multi-URL fetch, and an AI browser agent.",
        description: "Access to the live web — browser-rendered, " +
            "never-cached web, news, and research-paper search; clean " +
            "Markdown, HTML, or JSON extraction for up to 10 URLs per call " +
            "with CSS-scoped selection and conditional 304 re-fetch; and an " +
            "AI browser agent that navigates, clicks, types, and extracts " +
            "from a natural-language goal, optionally starting from a saved " +
            "login (browser profile).",
        homepageUrl: "https://tinyfish.ai",
        docsUrl: "https://docs.tinyfish.ai",
        categories: ["web-search", "agents"],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://agent.tinyfish.ai" },
    usage: {
        // FREE (designs D25/D27) is the default: search, fetch, and the
        // profile endpoints bill nothing. Free-ness is a MODEL fact — the
        // quantities fns are compiler-synthesized and there is no vendor
        // meter to consolidate.
        model: { kind: UsageModelKind.FREE },
        /** The ONE pool (design D26): TinyFish publishes its agent price
         *  in dollars, so the pool IS dollars. Drained by
         *  `automation/run`. */
        credits: { default: { label: "US dollars" } },
    },
});
