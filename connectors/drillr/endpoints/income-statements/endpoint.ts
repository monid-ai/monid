import { defineEndpoint, UsageModelKind } from "@shared/core";
import { STATEMENT_ROW_META } from "../../schema/common.ts";
import { zIncomeStatementsQueryParams } from "./schema/inputs.ts";

/** GET /income-statements — one row per reporting period. */
export default defineEndpoint({
    meta: {
        displayName: "Get Income Statements",
        summary: "Income statement line items for up to 10 companies, " +
            "one row per reporting period.",
        description: "Fetch income statements for up to 10 tickers, one " +
            "row per fiscal year or fiscal quarter, most recent first up " +
            "to `limit` periods per ticker. Line items: revenue, " +
            "cost_of_revenue, gross_profit, R&D, selling, G&A and " +
            "combined SG&A expense, operating_expenses, operating_income, " +
            "interest income and expense, pretax_income, " +
            "income_tax_expense, net_income, net income attributable to " +
            "the parent and to noncontrolling interests, " +
            "depreciation_and_amortization, share_based_compensation, " +
            "basic and diluted EPS, dividend_per_share, weighted average " +
            "shares, and a derived ebitda, plus the China-only " +
            "taxes_and_surcharges and the JP-GAAP-only ordinary_income " +
            "and extraordinary gains / losses. " + STATEMENT_ROW_META +
            " For ratios and margins already computed, use " +
            "`/financial-metrics-snapshot`.",
        docsUrl: "https://drillr.ai/docs/api/income-statements",
        categories: ["equities"],
        notes: [
            "Coverage is the last 3 years of filings for US, China and " +
            "Japan companies.",
            "Amounts are in the row's `currency` (the reporting " +
            "currency), unscaled. A line item that the filing does not " +
            "carry, or that cannot be calculated reliably, is null — " +
            "never zero-filled.",
            "`period` values are quarters of the company's own fiscal " +
            "year, not calendar quarters; read `period_start` / " +
            "`report_period` for the dates.",
            "No data for the requested periods is a 200 with an empty " +
            "`data` array.",
            "Quarterly amounts may be derived by subtracting cumulative " +
            "disclosures; such fields are named in `derived_fields`. " +
            "`ebitda` is always derived (operating_income + " +
            "depreciation_and_amortization).",
        ],
    },
    request: { method: "GET", path: "/income-statements" },
    input: { schema: { queryParams: zIncomeStatementsQueryParams } },
    usage: {
        /** 0.02 credits per call — the endpoint's page states "20 cr /
         *  thousand calls"; a multi-ticker request is still one call. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "data call",
            consumes: { credit: "default", amount: 0.02 },
        },
    },
});
