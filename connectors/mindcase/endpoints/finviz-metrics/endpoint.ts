import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFinvizMetricsBody } from "./schema/inputs.ts";

/**
 * Mindcase `finviz/metrics`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Finviz Metrics",
        summary:
            "Finviz stock metrics for US-listed stocks with company name, " +
            "index membership, market cap class, valuation, growth, " +
            "margins and ownership. Pass the US...",
        description:
            "Finviz stock metrics for US-listed stocks with company name, " +
            "index membership, market cap class, valuation, growth, " +
            "margins and ownership. Pass the US tickers to look up. " +
            "Returns one row per metric with ticker, companyName, " +
            "indexMembership, marketCapClass, price, marketCap, " +
            "enterpriseValue, peRatio, forwardPeRatio, pegRatio, " +
            "priceToSales, priceToBook, priceToFreeCashFlow, evToEbitda, " +
            "epsTtm, epsNextQuarter, epsGrowthThisYearPercent, " +
            "epsGrowthNextYearPercent, salesTtm, netIncomeTtm, " +
            "grossMarginPercent, operatingMarginPercent, " +
            "profitMarginPercent, roePercent, roaPercent, roicPercent, " +
            "debtToEquity, longTermDebtToEquity, currentRatio, quickRatio " +
            "and 15 more fields. For live prices use " +
            "mindcase#yahoo-finance/prices; for reported financials use " +
            "mindcase#sec/financials-as-reported. $0.0025 per metric; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/finviz/metrics",
        categories: ["equities"],
    },
    endpoint: "/finviz/metrics",
    request: { method: "POST", path: "/v1/data/finviz/metrics/run" },
    input: {
        schema: {
            body: zFinvizMetricsBody,
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
            const capped = body.tickers.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
