/** Search rate table, checked 2026-11-03: https://exa.ai/pricing
 *  lite $0.004, auto $0.007, deep $0.012 per call (first 10 results),
 *  $0.001 per result above 10 and per result summary. Types the page
 *  does not list were checked against live costDollars.total on
 *  2026-11-02: instant and neural $0.004, fast $0.007, deep-lite $0.012,
 *  deep-reasoning $0.015. */
import { defineProvider, presets } from "@shared/core";

export default defineProvider({
    name: "exa",
    meta: {
        displayName: "Exa",
        summary: "AI-native web search and content extraction.",
        description: "AI-native web search and content extraction — neural " +
            "and keyword search across the open web with built-in highlights, " +
            "summaries, and structured output extraction. Exa indexes the web " +
            "for embedding-based retrieval, so a query can describe the page " +
            "you want in natural language instead of matching keywords.",
        homepageUrl: "https://exa.ai",
        docsUrl: "https://exa.ai/docs",
        categories: ["web-search"],
    },
    auth: {
        inject: presets.auth.header("x-api-key"),
        // credentials omitted → default { apiKey: non-empty string } (§sections/auth.ts)
    },
    request: { baseUrl: "https://api.exa.ai" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26): exa's published prices are two
         *  independent $ lines (base search + per-extra-result), so the
         *  pool is US dollars — pinned v1 vendor unit prices, re-audited
         *  on repricing (the apify posture). */
        credits: { default: { label: "US dollars" } },
        /** The vendor's OWN claim (design D27): every exa response
         *  carries a `costDollars` receipt — pluck the whole node out of
         *  the payload, read `.total` off it. Entry OMITTED when absent
         *  (falls back to the derived fold); a present claim WINS and the
         *  pinned rates become the per-run cross-check. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.costDollars",
            );
            const total = value === undefined
                ? undefined
                : utils.json.optionalNum(value, "$.total");
            return {
                credits: {
                    ...(total !== undefined ? { default: total } : {}),
                },
                output: rest,
            };
        },
    },
});
