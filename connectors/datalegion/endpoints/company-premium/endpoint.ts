import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompanyEnrichBody } from "../../schema/company.ts";

/** POST /company/enrich as the `company/enrich/premium` product: the vendor returns every field this product includes, so no filter is added. */
export default defineEndpoint({
    meta: {
        displayName: "Data Legion Company Premium",
        summary:
            "A company's firmographics plus headcount, hiring, attrition, " +
            "growth, and workforce breakdowns.",
        description: "Enrich a company with Base firmographics plus Premium " +
            "workforce analytics: headcount and its monthly history, " +
            "hiring, attrition, growth and turnover rates, tenure, " +
            "seniority, job-function, expense-category and education " +
            "breakdowns, LinkedIn audience and employee counts, and " +
            "freshness indicators. Fields vary by matched record.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/company-enrichment",
        categories: ["company-enrichment"],
        notes: [
            "Billed 1 credit per returned record; a lookup with no match " +
            "(HTTP 404) is free.",
        ],
    },
    endpoint: "/company/enrich/premium",
    request: { method: "POST", path: "/company/enrich" },
    input: {
        schema: { body: zCompanyEnrichBody },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "records",
            consumes: { credit: "company", amount: 1 },
        },
    },
});
