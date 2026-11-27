import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchCompaniesQueryParams } from "./schema/inputs.ts";

// Market sizing lives on its own FREE endpoint (`POST /api/v1/companies/preview`),
// so `preview` is omitted here to keep this endpoint's $0.01/Record model exact.
const zBoundSearchCompaniesQuery = zSearchCompaniesQueryParams
    .omit({ preview: true })
    .extend({
        limit: zSearchCompaniesQueryParams.shape.limit.unwrap().default(25),
    });

/** GET /api/v1/companies: search 28M+ US private companies ($0.01/Record). */
export default defineEndpoint({
    meta: {
        displayName: "Dealport Search Companies",
        summary:
            "Search 28M+ US private operating businesses across buy-box filters ($0.01 per new Record).",
        description:
            "Search Dealport's 28M+ US private business Records by state, " +
            "counties, cities, multi-state markets, NAICS codes, revenue, " +
            "employee headcount, independent ownership, multi-business " +
            "owners, Medicare enrollment, state health licenses, SEC Form " +
            "ADV registration, or storefront signals. Returns company UUIDs, " +
            "primary-cited revenue and headcount bands, website, phone, and " +
            "filing source counts, plus `next_cursor` for pagination. Call " +
            "Preview Companies first to size a market for $0.00.",
        docsUrl: "https://dealport.com/docs",
        categories: ["company-enrichment", "government-data"],
        notes: [
            "Each new company Record returned costs $0.01; repeat reads of " +
            "the same company in the same workspace within 30 days cost $0.00.",
        ],
    },
    request: { method: "GET", path: "/api/v1/companies" },
    input: { schema: { queryParams: zBoundSearchCompaniesQuery } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "company records",
            description:
                "new company Records returned ($0.00 on 30-day workspace repeat)",
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.queryParams.limit },
        }),
        evidence: ({ data, utils }) => {
            const costUsd = utils.json.optionalNum(data.output, "$.cost_usd");
            const cents = utils.json.optionalNum(
                data.output,
                "$.credits_charged",
            );
            if (costUsd === 0 || cents === 0) {
                return { counts: { RESULT: 0 } };
            }
            return {
                counts: {
                    RESULT: utils.json.optionalLen(data.output, "$.data") ?? 0,
                },
            };
        },
    },
});
