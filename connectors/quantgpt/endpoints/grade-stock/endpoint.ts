import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGradeStockBody } from "./schema/inputs.ts";

/**
 * `POST /api/v1/tools/grade_stock`: one ticker's multi-factor report card.
 *
 * Flat US$0.03 per successful call; estimate and evidence are
 * compiler-synthesized (flat model). An unknown ticker is the tool's own
 * refusal (400), which is data and free. Strict body at the binding, and
 * `ticker` must carry a non-space character, so an empty string fails
 * INVALID_INPUT before the wire instead of reaching the tool.
 */
export default defineEndpoint({
    meta: {
        displayName: "QuantGPT Grade Stock",
        summary: "Grade one US stock A+ to F on six factor dimensions.",
        description: "Returns a report card for one US ticker: a grade " +
            "from A+ to F on each of six dimensions (momentum, value, " +
            "quality, growth, earnings track, money flows) ranked against " +
            "the whole universe of stocks above $2B in market cap, point " +
            "in time, plus a composite grade. Each dimension shows its " +
            "drivers: the inputs, their universe percentiles and the " +
            "weights. The stock is also placed against its GICS industry " +
            "peers. The grades describe where the stock ranks on past " +
            "and current data: research and history, not a buy or sell " +
            "rating, advice or a forecast. For the market as a whole use " +
            "quantgpt#tools/market_snapshot; to test a selection rule " +
            "over history use quantgpt#tools/run_backtest.",
        categories: ["equities"],
        notes: [
            "US$0.03 per successful call. An unknown ticker is refused " +
            "with a 400 and is free.",
        ],
    },
    request: { method: "POST", path: "/tools/grade_stock" },
    input: {
        schema: {
            body: zGradeStockBody.extend({
                ticker: zGradeStockBody.shape.ticker.min(1).regex(/\S/),
            }).strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.03 },
        },
    },
});
