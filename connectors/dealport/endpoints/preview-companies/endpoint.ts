import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPreviewCompaniesBody } from "./schema/inputs.ts";

/** POST /api/v1/companies/preview: free market sizing and 5 sample companies. */
export default defineEndpoint({
    meta: {
        displayName: "Dealport Preview Companies",
        summary:
            "Size a US private company market for $0.00 and inspect up to 5 sample companies.",
        description:
            "Run a free ($0.00) read-only market sizing count across 28M+ US " +
            "private operating businesses and inspect up to 5 matching sample " +
            "companies (UUID, name, city, state, industry, employee band, " +
            "revenue band, and independent status) before unlocking paid " +
            "company Records. Use this first to calibrate NAICS, geography, " +
            "headcount, revenue, healthcare, SEC Form ADV, or storefront " +
            "filters.",
        docsUrl: "https://dealport.com/docs",
        categories: ["company-enrichment"],
    },
    request: { method: "POST", path: "/api/v1/companies/preview" },
    input: { schema: { body: zPreviewCompaniesBody } },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
