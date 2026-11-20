import { z } from "zod";

/**
 * `POST /api/v1/tools/run_backtest` body: the tool's own inputSchema
 * (GET /api/v1/tools, 2026-11-20). Every argument is optional; an empty
 * body runs the default book (rank by ret_12_1, top 20, monthly, from
 * 1998, against $SPXTR). Mirror carries optionality only (D25); the
 * numeric bounds below are the vendor's own (`minimum` / `maximum` in its
 * schema), strictness lives at the binding in endpoint.ts.
 */

/** One filter: a factor id, an operator and a threshold. */
const zFilter = z.object({
    f: z.string().describe(
        "Factor id from QuantGPT's factor vocabulary, e.g. ret_12_1, " +
            "rsi_2, hv_20.",
    ),
    op: z.enum([">=", "<=", ">", "<", "is"]).describe(
        ">= and <= keep a value equal to v; > and < leave it out; is " +
            "matches a boolean factor.",
    ),
    v: z.union([z.number(), z.boolean()]).describe(
        "Threshold number, or a boolean for boolean factors.",
    ),
});

export const zRunBacktestBody = z.object({
    filters: z.array(zFilter).max(8).describe(
        "Up to 8 filters; a stock must pass all of them to be eligible.",
    ).optional(),
    rank_by: z.string().describe(
        "Numeric factor id the eligible stocks are ranked by, default " +
            "ret_12_1 (12-month return skipping the last month).",
    ).optional(),
    rank_dir: z.enum(["desc", "asc"]).describe(
        "desc (default) holds the highest values, asc the lowest.",
    ).optional(),
    top_n: z.number().int().min(1).max(100).describe(
        "Names held each period, default 20; with a ticker list the " +
            "default is the list's length and 1 is allowed.",
    ).optional(),
    benchmark: z.string().describe(
        "$SPXTR (default: S&P 500 total return). $SPX, $NDX, $COMP, $DJI " +
            "and $RUT are price indexes without dividends, and the result " +
            "says so.",
    ).optional(),
    start_year: z.number().int().min(1990).describe(
        "Default 1998. Before 1998 only companies that survived have " +
            "prices, so an earlier start is allowed but the result carries " +
            "a line splitting its CAGR before and from 1998.",
    ).optional(),
    entry: z.enum(["close", "next_open", "next_close"]).describe(
        "When a book formed at a period close is entered: close (default), " +
            "next_open or next_close. Exits move by the same lag.",
    ).optional(),
    split_year: z.number().int().describe(
        "Walk-forward split year, default 2015: in-sample before, " +
            "out-of-sample from it.",
    ).optional(),
    rebalance: z.enum(["monthly", "weekly", "daily"]).describe(
        "Formation cadence, default monthly. Weekly runs from 1995 and " +
            "daily from 2016 (clamped automatically, and the result says " +
            "so).",
    ).optional(),
    stop_loss: z.number().min(0.01).max(0.9).describe(
        "Sell a position this fraction below its entry price, e.g. 0.10. " +
            "Triggers on the day's low and fills at the worse of the stop " +
            "and that day's open.",
    ).optional(),
    trailing_stop: z.number().min(0.01).max(0.9).describe(
        "Sell a position this fraction below its highest close since " +
            "entry.",
    ).optional(),
    dynamic_stop: z.union([
        z.number(),
        z.object({
            atr_mult: z.number().optional(),
            atr_days: z.number().int().optional(),
        }),
    ]).describe(
        "Volatility-scaled trailing stop: N x ATR below the highest close " +
            "since entry. A number for the multiple, or {atr_mult, " +
            "atr_days} (default 14 days).",
    ).optional(),
    ma_exit: z.union([
        z.number().int(),
        z.object({ days: z.number().int().optional() }),
    ]).describe(
        "Sell when the close is under its own N-day moving average (5 to " +
            "400 days), filled at the next day's open. A number of days, " +
            "or {days}.",
    ).optional(),
    portfolio_size: z.number().int().min(5).max(500).describe(
        "Denominator for position weights. Larger than top_n holds the " +
            "remainder in cash. Cannot be smaller than top_n.",
    ).optional(),
    cash_as_holding: z.boolean().describe(
        "When fewer names qualify than the book has room for, hold the " +
            "difference in cash instead of concentrating.",
    ).optional(),
    random_controls: z.number().int().min(0).max(100).describe(
        "Also run N random books from the same filtered universe and place " +
            "the strategy's Sharpe in that distribution (20 is plenty). " +
            "Default 0 = off.",
    ).optional(),
    tickers: z.union([z.array(z.string()).max(500), z.string()]).describe(
        "Backtest these names instead of the whole market: a list, or one " +
            "comma-separated string, up to 500. Filters and rank_by still " +
            "apply. A list picked today carries hindsight.",
    ).optional(),
    weighting: z.enum([
        "equal",
        "market_cap",
        "inverse_vol",
        "factor",
        "custom",
    ]).describe(
        "Position sizing, default equal. custom uses `weights` (ticker " +
            "lists only).",
    ).optional(),
    max_weight: z.number().gt(0).max(1).describe(
        "Cap per name, e.g. 0.10; the excess is spread over the other " +
            "names.",
    ).optional(),
    min_weight: z.number().gt(0).max(0.5).describe(
        "Floor per name, e.g. 0.01.",
    ).optional(),
    vol_window: z.union([z.literal(60), z.literal(252)]).describe(
        "inverse_vol only: trailing trading days, default 60.",
    ).optional(),
    weights: z.union([z.record(z.string(), z.number()), z.string()])
        .describe(
            'weighting=custom: {ticker: weight}, e.g. {"AAPL": 0.6, ' +
                '"MSFT": 0.4}; normalized.',
        ).optional(),
    name: z.string().describe("A label for the run.").optional(),
});
