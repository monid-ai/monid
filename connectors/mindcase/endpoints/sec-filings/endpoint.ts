import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSecFilingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `sec/filings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "SEC Filings",
        summary:
            "SEC filings with company, ticker, CIK, form type, filed date " +
            "and period of report. Search by company.",
        description:
            "SEC filings with company, ticker, CIK, form type, filed date " +
            "and period of report. Search by company. Returns one row per " +
            "filing with accessionNumber, companyName, ticker, cik, " +
            "formType, filedDate, periodOfReport, title, documentUrl, " +
            "filingIndexUrl, isXbrl, isInlineXbrl. For the numbers inside " +
            "10-K and 10-Q filings use " +
            "mindcase#sec/financials-as-reported; for Form 4 insider " +
            "trades use mindcase#sec/insider-trades; for 13D/13G stakes " +
            "use mindcase#sec/beneficial-ownership. $0.002 per filing; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/sec/filings",
        categories: ["equities", "government-data"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/sec/filings",
    request: { method: "POST", path: "/v1/data/sec/filings/run" },
    input: {
        schema: {
            body: zSecFilingsBody.extend({
                maxResults: zSecFilingsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many filings to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
