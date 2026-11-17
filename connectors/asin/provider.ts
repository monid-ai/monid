import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Asin (www.asin.dev). Synchronous GET endpoints against
 * `https://www.asin.dev/api/v1`, auth a `Bearer` token.
 *
 * Billing: The three reads here are free on Asin: searching, the price
 * history and the offers already known draw no credit (measured in the
 * Treg catalog run, 2026-11-09: `charged: false`). Asin's credits pay for
 * tracking and fresh checks, which this connector does not expose, so it
 * declares no credit pool and every endpoint is FREE.
 */
export default defineProvider({
    name: "asin",
    meta: {
        displayName: "Asin",
        summary:
            "Search Amazon stores and read a product's price history and offers.",
        description:
            "An Amazon price tracking API: search an Amazon store (com, " +
            "co.uk, de, fr, it, es, ca, co.jp) for products with their ASIN, " +
            "price, rating and review count, and read the price history and " +
            "the offers Asin has recorded for a product. Use it to compare " +
            "products or check whether a price is a good one.",
        homepageUrl: "https://www.asin.dev",
        docsUrl: "https://www.asin.dev/developers",
        categories: ["amazon"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://www.asin.dev/api/v1" },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
