import { defineProvider, presets } from "@shared/core";

/**
 * QuantGPT: US equity research tools (market state, stock grades,
 * criteria backtests, a strategy library) over plain HTTPS against
 * `https://terminal.quantgpt.co/api/v1`, auth `Authorization: Bearer
 * qg_pk_<48 hex>` (a partner key; it opens /api/v1 only, never /mcp).
 *
 * Every tool is one route, `POST /tools/{name}`, whose JSON body is the
 * tool's arguments. A 200 answers `{tool, result, disclaimer}`; a refusal
 * answers `{error, ..., disclaimer}` with a status a program can act on
 * (400 bad arguments or the tool refused them, 404 not a tool on this key
 * or the API switched off, 429 over a cap or the engine busy, with
 * Retry-After; 503 engine at capacity; 500 any other failure).
 *
 * Three endpoints answer synchronously. `run_backtest` is ASYNC: a fast run
 * answers its finished result in the call, a slow one answers
 * `result.status: "running"` with a `job_id`, collected with
 * `POST /tools/fetch_job`. The lifecycle lives on that endpoint only,
 * because a provider-level `lifecycle.start` would be inherited by the
 * synchronous endpoints and replace their declarative execution.
 *
 * Billing: the pool is US dollars, the prices are flat per successful
 * call and pinned per endpoint. The vendor reports no per-response meter,
 * so there is no `consolidate` and the derived fold settles. Non-2xx is
 * data and zero-billed by the engine. Our own meter bills a backtest once,
 * when its finished result is delivered, never for a running answer or a
 * poll, which matches the lifecycle here.
 */
export default defineProvider({
    name: "quantgpt",
    meta: {
        displayName: "QuantGPT",
        summary: "US stock research: market state, stock grades, " +
            "criteria backtests and a strategy library.",
        description: "Research tools over a US equity warehouse. " +
            "market_snapshot reads the current state of the market " +
            "(index trends, breadth, sectors, rates, volatility, " +
            "liquidity, crypto, and on request your own symbols). " +
            "grade_stock grades one ticker A+ to F on six dimensions " +
            "against the $2B+ universe, point in time. run_backtest " +
            "tests a stock-selection rule (filters, a ranking factor, " +
            "top N) over history with walk-forward validation against a " +
            "benchmark and returns full statistics, a decade table and " +
            "one of three findings. search_library searches a library " +
            "of documented strategies and says which ones run as a " +
            "backtest. Every answer describes what past data did: it is " +
            "research and history, not investment advice, a forecast or " +
            "a recommendation, and no tool places or reaches an order.",
        homepageUrl: "https://quantgpt.co",
        categories: ["equities"],
        notes: [
            "Every answer, success or refusal, carries a `disclaimer` " +
            "field with the research posture. Report results as they " +
            "come back, losing years included.",
            "US equities only. Single-stock history is thin before 1980, " +
            "and before 1998 only companies that survived have prices, " +
            "so a market-wide result that starts earlier leans toward " +
            "survivors and says so in its own result.",
            "A 429 answer carries Retry-After: the key's calls a minute " +
            "or a day, a tool's own day cap, or a busy engine. Refusals " +
            "and errors are free.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://terminal.quantgpt.co/api/v1" },
    /** The synchronous tools answer in seconds; a cold market_snapshot or
     *  a grade_stock that draws its chart pack can take longer, and the
     *  public route sits behind a proxy with a ~100 s ceiling, so the
     *  budget is set just under that ceiling. */
    timeouts: { requestMs: 95_000, runMs: 100_000 },
    usage: {
        /** THE credit system (design D26): the published prices are in
         *  US dollars per successful call, so the pool is dollars (the
         *  exa / keenable posture). Each endpoint pins its own rate. */
        credits: { default: { label: "US dollars" } },
    },
    output: {
        /** QuantGPT's error envelope is `{error: string, ...}` (plus
         *  `problems` on bad arguments, `running` on the backtest run
         *  line, `disclaimer` on every partner answer). Non-2xx is DATA:
         *  the engine zero-bills it. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.error");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "QuantGPT API error",
                raw: data.output,
            };
        },
    },
});
