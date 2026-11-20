import { defineEndpoint, UsageModelKind } from "@shared/core";
import { STATEMENT_ROW_META } from "../../schema/common.ts";
import { zCashFlowStatementsQueryParams } from "./schema/inputs.ts";

/** GET /cash-flow-statements — one row per reporting period. */
export default defineEndpoint({
    meta: {
        displayName: "Get Cash Flow Statements",
        summary: "Cash flow statement line items for up to 10 companies, " +
            "one row per reporting period.",
        description: "Fetch cash flow statements for up to 10 tickers, " +
            "one row per fiscal year or fiscal quarter, most recent first " +
            "up to `limit` periods per ticker. Line items: " +
            "operating_cash_flow, change_in_working_capital, " +
            "capital_expenditures, acquisitions_net, " +
            "purchases_of_investments, proceeds_from_investments, " +
            "investing_cash_flow, share_repurchases, dividends_paid, " +
            "financing_cash_flow, effect_of_exchange_rate_on_cash, " +
            "net_change_in_cash, cash_at_end_of_period, " +
            "income_taxes_paid, interest_paid, and the derived " +
            "free_cash_flow (operating_cash_flow + capital_expenditures). " +
            STATEMENT_ROW_META,
        docsUrl: "https://drillr.ai/docs/api/cash-flow-statements",
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
            "Signs follow the statement direction: outflows such as " +
            "capital_expenditures, share_repurchases and dividends_paid " +
            "are negative.",
            "For China, `dividends_paid` is the statutory line that " +
            "also includes interest payments, returned as filed.",
            "Half-year or full-year cumulative amounts are never " +
            "returned as a single quarter; a quarter that cannot be " +
            "derived is absent or null.",
        ],
    },
    request: { method: "GET", path: "/cash-flow-statements" },
    input: { schema: { queryParams: zCashFlowStatementsQueryParams } },
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
