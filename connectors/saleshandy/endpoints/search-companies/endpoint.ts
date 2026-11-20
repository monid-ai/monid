import { defineEndpoint } from "@shared/core";
import { zSearchCompanies } from "../../schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Search Saleshandy Companies",
        summary:
            "Find B2B companies by domain, firmographics, and business signals.",
        description:
            "Search Saleshandy Lead Finder for companies. Filter by name, domain, headquarters, " +
            "industry, headcount, funding, technologies, hiring, or business signals. Results " +
            "include company previews and pagination metadata in payload.company. A search with " +
            "no matches returns payload as an empty array.",
        docsUrl:
            "https://developer.saleshandy.com/api-reference/enrichment/search-companies",
        categories: ["company-enrichment"],
    },
    endpoint: "/search/companies",
    request: { method: "POST", path: "/v1/search/companies" },
    input: { schema: { body: zSearchCompanies } },
});
