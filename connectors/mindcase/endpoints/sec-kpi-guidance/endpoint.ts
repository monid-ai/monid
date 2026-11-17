import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSecKpiGuidanceBody } from "./schema/inputs.ts";

/**
 * Mindcase `sec/kpi-guidance`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "SEC KPI Guidance",
        summary:
            "Headline KPIs and guidance from 8-K earnings releases filed " +
            "with the SEC, with revenue, net income, EPS and outlook. " +
            "Pass US tickers (SEC filers only).",
        description:
            "Headline KPIs and guidance from 8-K earnings releases filed " +
            "with the SEC, with revenue, net income, EPS and outlook. " +
            "Pass US tickers (SEC filers only). Returns one row per " +
            "filing with accessionNumber, ticker, cik, companyName, form, " +
            "items8K, filingDate, acceptedAt, period, fiscalPeriod, " +
            "headline, releaseUrl, filingIndexUrl, revenue, " +
            "revenueAdjusted, netIncome, epsDilutedGaap, epsAdjusted, " +
            "guidance, outlook. For full statement line items use " +
            "mindcase#sec/financials-as-reported; for the filing index " +
            "use mindcase#sec/filings. $0.06 per filing; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/sec/kpi-guidance",
        categories: ["equities"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/sec/kpi-guidance",
    request: { method: "POST", path: "/v1/data/sec/kpi-guidance/run" },
    input: {
        schema: {
            body: zSecKpiGuidanceBody.extend({
                maxResults: zSecKpiGuidanceBody.shape.maxResults.unwrap().min(1)
                    .default(25).describe(
                        "How many filings to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.06 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
