import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanyEnrichBody } from "../../schema/company.ts";

/** POST /company/enrich under the Company Base key — the key selects the product (design D1). */
export default defineEndpoint({
    meta: {
        displayName: "Company Base",
        summary: "Basic company profile: name, domain, industry, company " +
            "size, type and founding year. Choose for company " +
            "identification and standard firmographics; use Premium for " +
            "workforce metrics and trends.",
        description: "Company identification and standard firmographic " +
            "enrichment with company name, headline, description, " +
            "domains, industry, company size, company type, founding " +
            "year, tickers and social profiles. Company size is a basic " +
            "profile attribute; this product excludes Premium workforce " +
            "metrics and trends. For detailed headcount, hiring, " +
            "attrition, growth, tenure and workforce breakdowns, pass the " +
            "same company identifier to /company/enrich/premium.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/company-enrichment",
        categories: ["company-enrichment"],
    },
    // both company products share one wire path, so the id carries the v1
    // product suffix
    endpoint: "/company/enrich/base",
    request: { method: "POST", path: "/company/enrich" },
    auth: {
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                "API-Key": data.params.companyBaseApiKey,
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
            consumes: { credit: "company_base", amount: 1 },
        },
    },
});
