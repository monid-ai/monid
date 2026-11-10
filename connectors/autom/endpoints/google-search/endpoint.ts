import { defineEndpoint } from "@shared/core";
import { zAutomGoogleSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/google/search — Search Google and get the live organic results.
 *
 * Billing: 1 Autom credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Autom Google Search",
        summary: "Search Google and get the live organic results.",
        description:
            "Run a Google search from a chosen country (`gl`) and language " +
            "(`hl`) and get the results page as JSON: `organic_results` with " +
            "position, title, link, domain and snippet. Supports Google " +
            "operators such as `site:` in the query. One page of about 10 " +
            "results per request; ask for the next page with `page`.",
        docsUrl: "https://docs.autom.dev",
        categories: ["web-search"],
        notes: ["1 Autom credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/google/search" },
    input: { schema: { queryParams: zAutomGoogleSearchQueryParams } },
});
