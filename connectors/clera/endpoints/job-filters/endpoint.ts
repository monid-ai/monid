import { defineEndpoint } from "@shared/core";

/**
 * Clera job filters — `GET https://www.getclera.com/api/public/search-filters`.
 * Live facet values with counts; the exact strings clera#job-search accepts.
 */
export default defineEndpoint({
    meta: {
        displayName: "Clera Job Filters",
        summary: "List the cities, work types and stages Clera has roles in.",
        description: "Returns the filter values currently in use on " +
            "getclera.com/search, each with its count of open roles: " +
            "cities, workplace types, role families, funding stages, the " +
            "number of roles that sponsor visas, and salary floors " +
            "(50k+ to 400k+). Use it before clera#job-search to pick exact " +
            "city spellings and to see whether a filter will return " +
            "anything. Takes no input.",
        docsUrl: "https://www.getclera.com/search",
        categories: ["jobs"],
    },
    endpoint: "/job-filters",
    request: { method: "GET", path: "/api/public/search-filters" },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.get(data.output, "$.data"),
    },
});
