import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanyEnrichBody } from "../../schema/company.ts";

/** POST /company/enrich under the Company Premium key — the key selects the product (design D1). */
export default defineEndpoint({
    meta: {
        displayName: "Company Premium",
        summary: "Company profile plus headcount, hiring, attrition, " +
            "growth, turnover, tenure and workforce breakdowns. Choose for " +
            "workforce analysis and company growth research beyond basic " +
            "firmographics.",
        description: "Workforce analysis, company growth research and " +
            "account qualification using Base firmographics such as name, " +
            "domain, industry, company size, type and founding year, plus " +
            "detailed headcount, hiring, attrition, growth, turnover, " +
            "tenure, workforce breakdowns, LinkedIn audience and employee " +
            "counts, and freshness indicators. When basic firmographics " +
            "suffice, pass the same company identifier to the cheaper " +
            "/company/enrich/base.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/company-enrichment",
        categories: ["company-enrichment"],
    },
    // both company products share one wire path, so the id carries the v1
    // product suffix
    endpoint: "/company/enrich/premium",
    request: { method: "POST", path: "/company/enrich" },
    auth: {
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                "API-Key": data.params.companyPremiumApiKey,
            },
        }),
    },
    input: {
        schema: {
            // v1's "Provide a company identifier" as one union (clay D13,
            // design D4): `industry` alone only sharpens a name match
            body: z.union([
                zCompanyEnrichBody.required({ domain: true }),
                zCompanyEnrichBody.required({ name: true }),
                zCompanyEnrichBody.required({ linkedin_id: true }),
                zCompanyEnrichBody.required({ social_url: true }),
                zCompanyEnrichBody.required({ ticker_symbol: true }),
                zCompanyEnrichBody.required({ legion_id: true }),
            ]).describe(
                "Pass one company identifier: domain, name, linkedin_id, " +
                    "social_url, ticker_symbol, or legion_id.",
            ),
        },
    },
    usage: {
        /** One credit per successful call from this product's own pool
         *  (design D2). Estimate and evidence are compiler-synthesized
         *  (flat model). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "match",
            consumes: { credit: "company_premium", amount: 1 },
        },
    },
});
