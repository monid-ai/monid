import { defineEndpoint } from "@shared/core";
import { zAutomBraveSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/brave/search — Search Brave and get the live organic results.
 *
 * Billing: 1 Autom credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Autom Brave Search",
        summary: "Search Brave and get the live organic results.",
        description:
            "Run a query on Brave Search, from a chosen country and language, " +
            "and get the organic results as JSON (`organic_results`). Brave " +
            "runs its own independent index.",
        docsUrl: "https://docs.autom.dev",
        categories: ["web-search"],
        notes: ["1 Autom credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/brave/search" },
    input: { schema: { queryParams: zAutomBraveSearchQueryParams } },
});
