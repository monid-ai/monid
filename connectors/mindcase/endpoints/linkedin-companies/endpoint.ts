import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinCompaniesBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/companies`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Companies",
        summary: "Get LinkedIn company data by company URL, or by searching " +
            "with filters (location, size, industry). Returns the full " +
            "company profile either way.",
        description:
            "Get LinkedIn company data by company URL, or by searching " +
            "with filters (location, size, industry). Returns the full " +
            "company profile either way. Returns one row per companie " +
            "with linkedinUrl, companyId, companySlug, logo, companyName, " +
            "tagline, description, website, ctaUrl, foundedYear, " +
            "employeeCount, employeeCountRange, followers, industry, " +
            "industryCategory, hqStreet, hqCity, hqState, hqCountry, " +
            "hqPostalCode, locations, specialities, activeStatus, " +
            "pageType, jobsUrl, employeesByLocation, verified, " +
            "employeesBySchool, employeesByFunction, employeesBySkill and " +
            "2 more fields. Call it by url (companies) or search (query). " +
            "To turn a website domain into its LinkedIn company page use " +
            "mindcase#linkedin/domain-lookup; to list a company's " +
            "employees use mindcase#linkedin/company-employees. $0.004 " +
            "per companie; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/companies",
        categories: ["linkedin", "company-enrichment"],
        notes: [
            "`maxResults` does not apply to `companies`: those return one " +
            "row per entry.",
        ],
    },
    endpoint: "/linkedin/companies",
    request: { method: "POST", path: "/v1/data/linkedin/companies/run" },
    input: {
        schema: {
            body: zLinkedinCompaniesBody.extend({
                maxResults: zLinkedinCompaniesBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Max companies to return (up to 1,000). Ignored when company URLs are passed. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.004 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.query ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.companies?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
