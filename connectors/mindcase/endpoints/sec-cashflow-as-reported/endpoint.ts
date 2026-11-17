import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSecCashflowAsReportedBody } from "./schema/inputs.ts";

/**
 * Mindcase `sec/cashflow-as-reported`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "SEC Cash Flow As Reported",
        summary:
            "Cash flow statements as reported to the SEC, by fiscal year " +
            "and period. Pass US tickers (SEC filers only).",
        description:
            "Cash flow statements as reported to the SEC, by fiscal year " +
            "and period. Pass US tickers (SEC filers only). Returns one " +
            "row per statement with accessionNumber, ticker, cik, " +
            "companyName, fiscalYear, fiscalPeriod, periodStart, " +
            "periodEnd, form, filedDate, currency, filingUrl, lineItems. " +
            "For income statement and balance sheet line items use " +
            "mindcase#sec/financials-as-reported; for earnings-release " +
            "KPIs and guidance use mindcase#sec/kpi-guidance. $0.021 per " +
            "statement; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/sec/cashflow-as-reported",
        categories: ["equities"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/sec/cashflow-as-reported",
    request: { method: "POST", path: "/v1/data/sec/cashflow-as-reported/run" },
    input: {
        schema: {
            body: zSecCashflowAsReportedBody.extend({
                maxResults: zSecCashflowAsReportedBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many statements to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.021 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
