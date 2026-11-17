import { defineEndpoint } from "@shared/core";
import { zAutomYahooSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/yahoo/search — Search Yahoo and get the live organic results.
 *
 * Billing: 1 Autom credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Autom Yahoo Search",
        summary: "Search Yahoo and get the live organic results.",
        description:
            "Run a query on Yahoo Search, from a chosen country and language, " +
            "and get the organic results as JSON (`organic_results`).",
        docsUrl: "https://docs.autom.dev",
        categories: ["web-search"],
        notes: ["1 Autom credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/yahoo/search" },
    input: { schema: { queryParams: zAutomYahooSearchQueryParams } },
});
