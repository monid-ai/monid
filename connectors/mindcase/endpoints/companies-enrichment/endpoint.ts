import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompaniesEnrichmentBody } from "./schema/inputs.ts";

/**
 * Mindcase `companies/enrichment`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Company Enrichment",
        summary: "Enrich a company domain, name or LinkedIn URL into a full " +
            "firmographic profile with funding, technology and headcount " +
            "data.",
        description:
            "Enrich a company domain, name or LinkedIn URL into a full " +
            "firmographic profile with funding, technology and headcount " +
            "data. Returns one row per companie with domain, companyName, " +
            "website, linkedinUrl, logo, description, foundedYear, " +
            "employeeCount, industry, secondaryIndustries, keywords, " +
            "sicCodes, naicsCodes, hqStreet, hqCity, hqState, hqCountry, " +
            "hqPostalCode, phone, twitterUrl, facebookUrl, annualRevenue, " +
            "totalFunding, latestFundingStage, latestFundingDate, " +
            "fundingEvents, parentCompany, marketCap, technologies, " +
            "subsidiaries and 6 more fields. If you only have a company " +
            "name and need its domain use " +
            "mindcase#companies/domain-lookup; for its tech stack use " +
            "mindcase#builtwith/techstack; for the LinkedIn company page " +
            "use mindcase#linkedin/companies. $0.052 per companie; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/companies/enrichment",
        categories: ["company-enrichment"],
    },
    endpoint: "/companies/enrichment",
    request: { method: "POST", path: "/v1/data/companies/enrichment/run" },
    input: {
        schema: {
            body: zCompaniesEnrichmentBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.052 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = (body.domains?.length ?? 0) +
                (body.names?.length ?? 0) + (body.linkedinUrls?.length ?? 0);
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
