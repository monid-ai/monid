import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSecFinancialsAsReportedBody } from "./schema/inputs.ts";

/**
 * Mindcase `sec/financials-as-reported`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "SEC Financials As Reported",
        summary: "Financial statement line items as reported to the SEC (one " +
            "row per company, concept and period), with the XBRL concept, " +
            "label, value and filing. Pass US...",
        description:
            "Financial statement line items as reported to the SEC (one " +
            "row per company, concept and period), with the XBRL concept, " +
            "label, value and filing. Pass US tickers (SEC filers only), " +
            "or pick one concept and a period to rank all companies. " +
            "Returns one row per line item with factId, ticker, cik, " +
            "companyName, statement, concept, label, taxonomy, value, " +
            "unit, periodStart, periodEnd, durationDays, periodType, " +
            "fiscalYear, fiscalPeriod, form, filedDate, accessionNumber, " +
            "frame, filingUrl. Call it by ticker (tickers) or all " +
            "companies (concept). For the cash flow statement laid out by " +
            "period use mindcase#sec/cashflow-as-reported; for headline " +
            "KPIs and guidance from earnings releases use " +
            "mindcase#sec/kpi-guidance; for non-US tickers use " +
            "mindcase#yahoo-finance/income-statements. $0.0045 per line " +
            "item; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/sec/financials-as-reported",
        categories: ["equities"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/sec/financials-as-reported",
    request: {
        method: "POST",
        path: "/v1/data/sec/financials-as-reported/run",
    },
    input: {
        schema: {
            body: zSecFinancialsAsReportedBody.extend({
                maxResults: zSecFinancialsAsReportedBody.shape.maxResults
                    .unwrap().min(1).default(50).describe(
                        "How many rows to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0045 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
