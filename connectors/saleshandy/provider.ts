import { defineProvider, presets, UsageModelKind } from "@shared/core";

export default defineProvider({
    name: "saleshandy",
    meta: {
        displayName: "Saleshandy",
        summary: "Search Saleshandy's B2B company and professional databases.",
        homepageUrl: "https://www.saleshandy.com",
        docsUrl: "https://developer.saleshandy.com/api-reference/introduction",
        categories: ["people-enrichment", "company-enrichment"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://open-api.saleshandy.com" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        // Lead Finder search previews do not reveal credit-metered contact data.
        model: { kind: UsageModelKind.FREE },
    },
});
