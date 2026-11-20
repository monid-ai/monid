import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFinancialMetricsSnapshotQueryParams } from "./schema/inputs.ts";

/** GET /financial-metrics-snapshot — one row of ratios per ticker. */
export default defineEndpoint({
    meta: {
        displayName: "Get Valuation and Financial Ratios",
        summary: "Precomputed market cap, valuation multiples, margins, " +
            "returns, growth, leverage and liquidity for up to 50 " +
            "companies.",
        description: "Fetch the latest precomputed valuation and " +
            "financial ratios for up to 50 tickers, one row per ticker: " +
            "shares_outstanding, market_capitalization (local currency " +
            "and USD), enterprise_value, TTM multiples (P/E, PEG, P/B, " +
            "P/S, P/CF, EV/Sales, EV/EBITDA, EV/EBIT), margins (gross, " +
            "EBITDA, EBIT, net income, FCF), returns (ROE, ROA, ROIC), " +
            "TTM growth and 3-year CAGRs for revenue, EPS, EBITDA, EBIT, " +
            "net income and FCF, dividend yield, payout and frequency, " +
            "leverage (debt to equity, assets and EBITDA, interest " +
            "coverage) and liquidity (current, quick and cash ratios, " +
            "working_capital). `price_date` and `statement_period_end` " +
            "say which close and which statement the row was computed " +
            "from. Covers the US, China and Japan. Use it to compare or " +
            "screen a known list of companies in one call; for the " +
            "underlying line items, use the three statement endpoints.",
        docsUrl: "https://drillr.ai/docs/api/financial-metrics-snapshot",
        categories: ["equities"],
        notes: [
            "Ratios are decimals, not percentages: 0.25 means 25%.",
            "This is not a quote: the share price itself is not " +
            "returned, and the values are computed from the close of " +
            "`price_date`, not in real time.",
            "There are no forecasts or analyst estimates here; EPS and " +
            "revenue estimates are on `/earnings-calendar`.",
            "Any metric can be null: a required statement component is " +
            "missing, there are too few periods (a 3-year CAGR needs " +
            "four full fiscal years), or the company pays no dividend. " +
            "`net_debt` ratios are null rather than negative when no " +
            "debt data exists.",
            "Monetary fields are in `currency`, the trading currency; " +
            "only `market_capitalization_usd` is converted.",
        ],
    },
    request: { method: "GET", path: "/financial-metrics-snapshot" },
    input: { schema: { queryParams: zFinancialMetricsSnapshotQueryParams } },
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
