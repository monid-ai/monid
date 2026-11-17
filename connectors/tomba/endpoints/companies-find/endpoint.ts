import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompaniesFindQueryParams } from "./schema/inputs.ts";

/** GET /companies/find — a company profile from a domain (Clearbit format). */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Company",
        summary:
            "Get a company's profile from its domain, in Clearbit's Company API format.",
        description: "Look up the company behind a domain and return a " +
            "Clearbit-compatible Company profile: name and legal name, " +
            "description, tags, founding year, headquarters address and " +
            "geo, SIC and NAICS codes, social handles, company type, " +
            "employee range, revenue estimate, traffic rank, email " +
            "provider, WHOIS, site phone numbers and emails, and detected " +
            "technologies. Fields Tomba doesn't fill are always null. " +
            "Suited for firmographic enrichment and account scoring, and as " +
            "a drop-in for Clearbit company enrichment.",
        docsUrl: "https://docs.tomba.io/api/enrichment#company-api",
        categories: ["company-enrichment"],
        notes: [
            "Charged 1 search credit only when a company is returned.",
            "No match is a 200 carrying an `errors` object instead of " +
            "`data` — type `not_found` (no record) or `params_invalid` " +
            "(webmail / disposable domain); it costs nothing.",
        ],
    },
    request: { method: "GET", path: "/companies/find" },
    input: {
        schema: {
            queryParams: zCompaniesFindQueryParams.required({ domain: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "companies found",
            description: "company profiles returned (a miss counts zero)",
            consumes: { credit: "search", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Found = a `data` object (a miss carries `errors` instead). */
        evidence: ({ data, utils }) => {
            const company = utils.json.optionalGet(data.output, "$.data");
            return {
                counts: {
                    RESULT: company !== null && typeof company === "object" &&
                            !Array.isArray(company)
                        ? 1
                        : 0,
                },
            };
        },
    },
});
