import { defineEndpoint, UsageModelKind } from "@shared/core";
import { STATEMENT_ROW_META } from "../../schema/common.ts";
import { zBalanceSheetsQueryParams } from "./schema/inputs.ts";

/** GET /balance-sheets — one row per reporting period, as of period end. */
export default defineEndpoint({
    meta: {
        displayName: "Get Balance Sheets",
        summary: "Balance sheet line items for up to 10 companies, one " +
            "row per reporting period.",
        description: "Fetch balance sheets for up to 10 tickers, one row " +
            "per fiscal year end or fiscal quarter end, most recent first " +
            "up to `limit` periods per ticker. Line items cover current " +
            "assets (cash_and_cash_equivalents, short_term_investments, " +
            "accounts_receivable, inventories), non-current assets " +
            "(property_plant_equipment, right_of_use_assets, goodwill, " +
            "intangible_assets, long_term_investments), total_assets, " +
            "current and non-current liabilities (accounts_payable, " +
            "short_term_debt, current_portion_of_long_term_debt, " +
            "deferred_revenue, long_term_debt, lease_liabilities), " +
            "total_liabilities, equity (common_stock, retained_earnings, " +
            "treasury_stock, equity_attributable_to_parent, " +
            "noncontrolling_interests, total_equity, temporary_equity), " +
            "and the derived total_debt and net_debt. " +
            STATEMENT_ROW_META,
        docsUrl: "https://drillr.ai/docs/api/balance-sheets",
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
            "`period_start` is always null: a balance sheet is a " +
            "point-in-time statement as of `report_period`.",
            "`total_debt` and `net_debt` are derived, and are null " +
            "when any component is missing. `net_debt` can be negative.",
        ],
    },
    request: { method: "GET", path: "/balance-sheets" },
    input: { schema: { queryParams: zBalanceSheetsQueryParams } },
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
