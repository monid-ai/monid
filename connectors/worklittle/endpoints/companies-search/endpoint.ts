import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompaniesSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /companies — resolve an employer name to its slug. FREE (`GET
 * /v1/pricing`; draws the shared `companies.search` quota, one unit per row
 * returned; the quota counts at `meta.quota` are stripped by the provider
 * consolidate).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Companies",
        summary:
            "Find an employer's Worklittle slug by name, among companies with open jobs.",
        description: "Look up employers by name or slug and get their " +
            "Worklittle `slug`, name, logo, website, one-line " +
            "description and industry. Only companies that currently have " +
            "open jobs in the index are returned, best match first. Use " +
            "it to turn 'jobs at Johnson & Johnson' into the exact " +
            "`company` slug worklittle#jobs/search and " +
            "worklittle#jobs/salary-average filter on; it does not list " +
            "jobs itself. Free.",
        docsUrl: "https://docs.worklittle.com/jobs/api/search-companies",
        categories: ["jobs", "company-enrichment"],
    },
    endpoint: "/companies/search",
    request: { method: "GET", path: "/companies" },
    input: {
        schema: {
            queryParams: zCompaniesSearchQueryParams.strict(),
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
