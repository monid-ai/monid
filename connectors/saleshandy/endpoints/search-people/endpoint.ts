import { defineEndpoint } from "@shared/core";
import { zSearchPeople } from "../../schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Search Saleshandy People",
        summary: "Find B2B professionals by role, employer, and location.",
        description:
            "Search Saleshandy Lead Finder for professionals. Filter by job title, department, " +
            "seniority, company domain, industry, headcount, or geography. Results include " +
            "professional profile previews and pagination metadata in payload.people. A search " +
            "with no matches returns payload as an empty array. This search does not reveal email " +
            "addresses or phone numbers.",
        docsUrl:
            "https://developer.saleshandy.com/api-reference/enrichment/search-people",
        categories: ["people-enrichment"],
    },
    endpoint: "/search/people",
    request: { method: "POST", path: "/v1/search/people" },
    input: { schema: { body: zSearchPeople } },
});
