import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMarketSnapshotBody } from "./schema/inputs.ts";

/**
 * `POST /api/v1/tools/market_snapshot`: the state of the US market in one
 * read-only call.
 *
 * Flat US$0.02 per successful call; estimate and evidence are
 * compiler-synthesized (flat model). The body is STRICT at the binding:
 * QuantGPT ignores an unknown argument name, so a misspelt `symbols` would
 * otherwise bill a call that silently left the watchlist out.
 */
export default defineEndpoint({
    meta: {
        displayName: "QuantGPT Market Snapshot",
        summary: "Read the current state of the US market in one call.",
        description: "Returns the state of the market as of the latest " +
            "data: the major indexes against their 50 and 200 day " +
            "averages, S&P 500 breadth, sector trends, rates and credit " +
            "spreads, the VIX, Fed liquidity and crypto. On request it " +
            "adds styles, macro, commodities and FX, the earnings week, " +
            "and up to 25 symbols of your own with the same trend fields. " +
            "Read only, cached for 5 minutes; intraday prices are delayed " +
            "about 16 minutes and labelled as such. It describes where " +
            "the market stands now and how it got there: research and " +
            "history, not advice or a forecast. For one stock's full " +
            "profile use quantgpt#tools/grade_stock; to test a rule over " +
            "history use quantgpt#tools/run_backtest.",
        categories: ["equities"],
        notes: [
            "US$0.02 per successful call. Refusals and errors are free.",
        ],
    },
    request: { method: "POST", path: "/tools/market_snapshot" },
    input: { schema: { body: zMarketSnapshotBody.strict() } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.02 },
        },
    },
});
