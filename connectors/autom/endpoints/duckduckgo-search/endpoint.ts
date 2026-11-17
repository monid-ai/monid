import { defineEndpoint } from "@shared/core";
import { zAutomDuckduckgoSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/duckduckgo/search — Search DuckDuckGo and get the live organic results.
 *
 * Billing: 1 Autom credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Autom DuckDuckGo Search",
        summary: "Search DuckDuckGo and get the live organic results.",
        description:
            "Run a query on DuckDuckGo, from a chosen country and language, " +
            "and get the organic results as JSON (`organic_results`).",
        docsUrl: "https://docs.autom.dev",
        categories: ["web-search"],
        notes: ["1 Autom credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/duckduckgo/search" },
    input: { schema: { queryParams: zAutomDuckduckgoSearchQueryParams } },
});
