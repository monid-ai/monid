import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompaniesQueryParams } from "./schema/inputs.ts";

/** GET /companies — billed per row returned. */
export default defineEndpoint({
    meta: {
        displayName: "Search Companies",
        summary:
            "Search companies by keyword, country, industry, size and recent " +
            "funding.",
        description:
            "Company records filtered by keyword (name, domain, description)," +
            " HQ country, LinkedIn industry, NAICS code, headcount bucket, " +
            "founded year, money raised in the last 12 months, known founders" +
            " and people, or one company by domain; ranked by recency or " +
            "prominence. Returns per company: id, name, domain, LinkedIn, " +
            "description, country, industry, headcount, founded year and " +
            "funding totals. 1 credit per company returned; includeTotal " +
            "gives the match count free.",
        docsUrl: "https://datahyena.com/docs",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/companies" },
    input: { schema: { queryParams: zCompaniesQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "rows",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.queryParams.limit },
        }),
    },
});
