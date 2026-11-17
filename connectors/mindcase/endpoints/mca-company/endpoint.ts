import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMcaCompanyBody } from "./schema/inputs.ts";

/**
 * Mindcase `mca/company`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "MCA Company",
        summary: "The public MCA record for an Indian company, looked up by " +
            "CIN or by name: registration and status, authorised and " +
            "paid-up capital, the registered address...",
        description:
            "The public MCA record for an Indian company, looked up by " +
            "CIN or by name: registration and status, authorised and " +
            "paid-up capital, the registered address, the full board of " +
            "directors, and the latest-year financial summary (revenue, " +
            "EBITDA, net profit, net worth and borrowings). All amounts " +
            "in rupees. Returns one row per companie with cin, " +
            "companyName, entityType, listingStatus, incorporationDate, " +
            "companyStatus, authorisedCapital, paidUpCapital, state, " +
            "city, district, pincode, registeredAddress, directorsCount, " +
            "directors, hasFinancials, latestFy, yearsOfData, " +
            "hasConsolidated, revenue, ebitda, netProfit, netWorth, " +
            "totalBorrowings. One or more 21-character CINs, or one or " +
            "more company names. For the multi-year profit and loss, " +
            "balance sheet and cash flow use " +
            "mindcase#mca/company-financials; for directors use " +
            "mindcase#mca/director. $0.05 per companie; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/mca/company",
        categories: ["government-data", "company-enrichment"],
        notes: [
            "Bills one row per input looked up; `maxResults` (optional) " +
            "only stops the run early.",
        ],
    },
    endpoint: "/mca/company",
    request: { method: "POST", path: "/v1/data/mca/company/run" },
    input: {
        schema: {
            body: zMcaCompanyBody.extend({
                maxResults: zMcaCompanyBody.shape.maxResults.unwrap().min(1)
                    .optional().describe(
                        "Stop after this many have been looked up. Each one costs a row, so this caps the bill as well as the output.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.05 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = (body.queries?.length ?? 0) +
                (body.names?.length ?? 0);
            const rows = Math.min(body.maxResults ?? Infinity, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
