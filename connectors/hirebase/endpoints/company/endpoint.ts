import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanyPathParams } from "./schema/inputs.ts";

/** GET /v2/hirebase/companies/{company_slug} — one company profile. */
export default defineEndpoint({
    meta: {
        displayName: "Get Company",
        summary: "Get one company's profile and a sample of its open " +
            "jobs, by slug.",
        description: "Fetch one company's full profile by its Hirebase " +
            "slug: name, website, LinkedIn URL, logo, description, " +
            "industry and sub-industries, headcount range, founded year, " +
            "headquarters and funding details where known, plus a sample " +
            "of the jobs it has open now. The slug comes from any job " +
            "result (company_slug) or from hirebase#companies/search, " +
            "which is also how to resolve a company name or website to a " +
            "slug. For ALL of a company's open jobs, use " +
            "hirebase#companies/{company_slug}/jobs. Suited for briefing " +
            "on an employer before applying or reaching out, and for " +
            "enriching a known account.",
        docsUrl:
            "https://www.hirebase.org/docs/api-reference/companies/get-company",
        categories: ["company-enrichment", "jobs"],
        notes: [
            "An unknown slug answers 404 and is not billed.",
        ],
    },
    endpoint: "/companies/{company_slug}",
    request: { method: "GET", path: "/hirebase/companies/{company_slug}" },
    input: { schema: { pathParams: zCompanyPathParams } },
    usage: {
        /** 1 unit of the companies allowance per lookup; the sample jobs
         *  that ride along are not billed. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "company",
            consumes: { credit: "companies", amount: 1 },
        },
    },
});
