import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMcaCompanyFinancialsBody } from "./schema/inputs.ts";

/**
 * Mindcase `mca/company-financials`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "MCA Company Financials",
        summary:
            "The full multi-year financial statements filed with the MCA " +
            "for an Indian company, looked up by CIN or by name: profit " +
            "and loss, balance sheet and cash...",
        description:
            "The full multi-year financial statements filed with the MCA " +
            "for an Indian company, looked up by CIN or by name: profit " +
            "and loss, balance sheet and cash flow, standalone and " +
            "consolidated, plus registered charges. Every year on file, " +
            "line item by line item, in rupees. Returns one row per " +
            "companie with cin, companyName, latestFy, yearsOfData, " +
            "netProfit, plStandalone, plConsolidated, bsStandalone, " +
            "bsConsolidated, cfStandalone, cfConsolidated, charges. One " +
            "or more 21-character CINs, or one or more company names. For " +
            "the company master record (status, capital, address, " +
            "directors) use mindcase#mca/company, which costs far less. " +
            "$1 per companie; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/mca/company-financials",
        categories: ["government-data", "company-enrichment"],
    },
    endpoint: "/mca/company-financials",
    request: { method: "POST", path: "/v1/data/mca/company-financials/run" },
    input: {
        schema: {
            body: zMcaCompanyFinancialsBody.extend({
                maxResults: zMcaCompanyFinancialsBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Stop after this many have been looked up. Each ROW costs, so this caps the bill as well as the output. With `names` it bounds the companies resolved, so you may get fewer rows than this if some have no financials on file. Set it when you send a name you have not narrowed. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
