import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Ecommerce Leads (getecommerceleads.com) — ecommerce store intelligence
 * for agents. One endpoint today: `GET /api/stores/lookup`, a store
 * profile by domain (estimated revenue, marketing budget, traffic by
 * channel, Google and Meta ad spend, ad counts, a Conversion Rate Score,
 * buying signals, social and ad-library links).
 *
 * FREE: the lookup costs 0 credits on every Ecommerce Leads plan (the
 * vendor's MCP server serves the same lookup without a login), so the
 * model is FREE at the provider level and the quantities fns are
 * compiler-synthesized. Ecommerce Leads credits are spent only on contact
 * reveals, which this connector does not expose.
 *
 * Auth is a Bearer API key (`Authorization: Bearer el_...`), issued in
 * the Ecommerce Leads dashboard. The vendor answers every non-2xx with
 * `{error: "<message>"}`.
 */
export default defineProvider({
    name: "ecommerce-leads",
    meta: {
        displayName: "Ecommerce Leads",
        summary: "Ecommerce store data by domain: revenue, traffic, ad " +
            "spend, and buying signals.",
        description: "Ecommerce Leads tracks 600,000+ ecommerce stores " +
            "(Shopify, WooCommerce, and others) and returns a store " +
            "profile for any domain: estimated monthly revenue, marketing " +
            "budget, total, organic, paid, and social traffic, estimated " +
            "Google and Meta ad spend, active and total Meta ad counts, a " +
            "Conversion Rate Score, buying signals that explain why the " +
            "store may need marketing help now, the platform, country, " +
            "industry, SKU count, and links to the store's social " +
            "profiles and ad libraries.",
        homepageUrl: "https://getecommerceleads.com",
        docsUrl: "https://getecommerceleads.com/docs/",
        categories: ["company-enrichment"],
        notes: [
            'Errors arrive as `{error: "<message>"}`: 400 for a missing ' +
            "domain, 401 for a bad key, 404 when no store matches the " +
            "domain, 429 when the rate limit is hit (with a Retry-After " +
            "header). All settle with zero usage.",
            "Money fields are in US dollars. Traffic fields are monthly " +
            "visits.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://getecommerceleads.com/api" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
