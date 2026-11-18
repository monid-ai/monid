import { defineEndpoint } from "@shared/core";
import { zLookupQueryParams } from "./schema/inputs.ts";

/**
 * Ecommerce Leads store lookup — `GET /api/stores/lookup?domain=...`.
 * Free (provider-level FREE model). The body is relayed verbatim.
 */
export default defineEndpoint({
    meta: {
        displayName: "Ecommerce Leads Store Lookup",
        summary: "Look up one ecommerce store by domain — free.",
        description: "Returns the Ecommerce Leads profile of one ecommerce " +
            "store, by domain. 'fields' holds: Name, Domain, Industry, " +
            "Country, Platform, Date Founded, SKUs, Est. Monthly Revenue " +
            "(USD), Est. Marketing Budget (USD), Total / Organic / Google " +
            "Paid / Paid Social / Organic Social Traffic (monthly visits), " +
            "Estimated Google Ad Spend and Estimated Meta Ad Spend (USD per " +
            "month), Total Meta Ads, Active Meta Ads, Number of Video Ads, " +
            "Conversion Rate Score (0-100), Likely to Outsource (marketing " +
            "channels), Buying Signals (a plain-text explanation of why the " +
            "store may need a marketing agency now) and Buying Signals List, " +
            "Store Phone Numbers, and links to Facebook, Instagram, TikTok, " +
            "LinkedIn, the Google Ads Library, and the Meta Ads Library. " +
            "'sharedMetrics' appears when other stores share the base " +
            "domain (their traffic and ad numbers are the same). Does not " +
            "return decision-maker contacts: 'decisionMakers.contacts' is " +
            "always empty here. Use this to qualify a store before outreach, " +
            "size a prospect's ad budget, or explain why a store is a lead. " +
            "Does not search or list stores: you must already know the " +
            "domain.",
        docsUrl: "https://getecommerceleads.com/docs/guide.md",
        categories: ["company-enrichment"],
        notes: [
            'A domain with no tracked store answers 404 `{error: "No ' +
            'store found for that domain."}` — zero usage.',
        ],
    },
    request: { method: "GET", path: "/stores/lookup" },
    input: { schema: { queryParams: zLookupQueryParams } },
});
