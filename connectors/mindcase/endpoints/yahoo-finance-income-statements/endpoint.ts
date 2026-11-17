import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYahooFinanceIncomeStatementsBody } from "./schema/inputs.ts";

/**
 * Mindcase `yahoo-finance/income-statements`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Yahoo Finance Income Statements",
        summary:
            "Income statements from Yahoo Finance with period, currency, " +
            "total revenue and cost of revenue. Pass Yahoo tickers, US or " +
            "global (AAPL, BRK-B, RELIANCE.NS...",
        description:
            "Income statements from Yahoo Finance with period, currency, " +
            "total revenue and cost of revenue. Pass Yahoo tickers, US or " +
            "global (AAPL, BRK-B, RELIANCE.NS, 7203.T). Returns one row " +
            "per statement with id, symbol, periodType, periodEnd, " +
            "currency, totalRevenue, costOfRevenue, grossProfit, " +
            "researchAndDevelopment, sellingGeneralAndAdministration, " +
            "operatingExpense, operatingIncome, interestExpense, ebit, " +
            "ebitda, netIncome, basicEPS, dilutedEPS. For US filers' " +
            "statements exactly as reported use " +
            "mindcase#sec/financials-as-reported. $0.0025 per statement; " +
            "empty runs cost nothing.",
        docsUrl:
            "https://docs.mindcase.co/apis/yahoo-finance/income-statements",
        categories: ["equities"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/yahoo-finance/income-statements",
    request: {
        method: "POST",
        path: "/v1/data/yahoo-finance/income-statements/run",
    },
    input: {
        schema: {
            body: zYahooFinanceIncomeStatementsBody.extend({
                maxResults: zYahooFinanceIncomeStatementsBody.shape.maxResults
                    .unwrap().min(1).default(50).describe(
                        "How many statements to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
