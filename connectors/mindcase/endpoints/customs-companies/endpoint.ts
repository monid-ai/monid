import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCustomsCompaniesBody } from "./schema/inputs.ts";

/**
 * Mindcase `customs/companies`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Customs Trade Companies",
        summary: "Ranked lists of importing or exporting companies for a " +
            "product or HS code, with aggregate trade weight, value and " +
            "deal count. Covers customs filings and...",
        description: "Ranked lists of importing or exporting companies for a " +
            "product or HS code, with aggregate trade weight, value and " +
            "deal count. Covers customs filings and trade statistics from " +
            "about 95 countries, including the United States, Mexico, " +
            "Brazil, Colombia, India, Indonesia, Vietnam, Pakistan, " +
            "Russia, Turkey, the UK and the EU. Returns one row per " +
            "companie with companyName, country, weightKg, quantity, " +
            "valueUsd, avgWeightUnitPriceUsd, avgQuantityUnitPriceUsd, " +
            "tradeCount. For the individual shipments use " +
            "mindcase#customs/shipments; for aggregate country-level " +
            "trade use mindcase#customs/trade-stats. $0.038 per companie; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/customs/companies",
        categories: ["government-data", "company-enrichment"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/customs/companies",
    request: { method: "POST", path: "/v1/data/customs/companies/run" },
    input: {
        schema: {
            body: zCustomsCompaniesBody.extend({
                maxResults: zCustomsCompaniesBody.shape.maxResults.unwrap().min(
                    1,
                ).default(50).describe(
                    "How many companies to return in total.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.038 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
