import { defineEndpoint } from "@shared/core";
import { zAutomGoogleNewsQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/google/news — Search Google News and get the live articles.
 *
 * Billing: 1 Autom credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Autom Google News",
        summary: "Search Google News and get the live articles.",
        description:
            "Search Google News for keywords, a company or a topic, from a " +
            "chosen country and language, and get the articles as JSON: " +
            "`organic_results` with title, link, source, snippet and date.",
        docsUrl: "https://docs.autom.dev",
        categories: ["news-search"],
        notes: ["1 Autom credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/google/news" },
    input: { schema: { queryParams: zAutomGoogleNewsQueryParams } },
});
