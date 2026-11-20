import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zRunBacktestBody } from "./schema/inputs.ts";

/**
 * `POST /api/v1/tools/run_backtest`: backtest a stock-selection rule.
 *
 * ASYNC (design D10/D21), start/poll:
 *   `POST /tools/run_backtest` -> 200 {tool, result, disclaimer}, where
 *       `result` is EITHER the finished report (a fast run; the cache hit
 *       of a recent identical run is one too) OR
 *       `{status: "running", job_id, seconds, next}` (a slow run);
 *   `POST /tools/fetch_job {job_id}` -> 200 with the same two shapes:
 *       the finished report (carrying `job_id`) or `status: "running"`.
 *       fetch_job long-polls server-side for a few seconds per call.
 *
 * `start` relays the submit. A finished report settles at once; a running
 * answer parks RUNNING with the job id as `externalRunId`. `poll` calls
 * fetch_job on the same origin (the URL is derived from the doc's own
 * request URL, so no path is hardcoded) and settles only on a finished
 * report. A "still running" answer is NEVER a COMPLETED envelope, so it can
 * never settle a bill: the PER_CALL line folds once, on the one 2xx
 * COMPLETED envelope that carries the finished result. That is the same
 * rule QuantGPT's own partner meter keeps (a running answer is `started`,
 * a poll is `poll`, neither billed; the bill lands once, when the finished
 * result is delivered).
 *
 * No `stop`: QuantGPT has no cancel route, and a job that is never
 * collected is never billed on either side (STOPPED_UNSETTLED). Jobs
 * expire an hour after they finish.
 *
 * Errors on the status LOOKUP are split. 429, 500, 502, 503, 504 and the
 * proxy's 520 to 524 mean the lookup failed, not the job: the run stays
 * RUNNING with a 30 s back-off, bounded by runMs. A 400 from fetch_job is
 * the job's own failure (or an expired job id): terminal, zero-billed
 * data. Any other non-2xx (401 / 404: the key was revoked or the API
 * switched off) is terminal data too.
 */
export default defineEndpoint({
    meta: {
        displayName: "QuantGPT Run Backtest",
        summary: "Backtest a US stock-selection rule over history, with " +
            "walk-forward validation.",
        description: "Tests a rule for picking US stocks over past data " +
            "and returns what it would have done. Give up to 8 filters " +
            "over QuantGPT's factor vocabulary, a factor to rank by and " +
            "how many names to hold (top N, equal weight by default, or " +
            "market cap, inverse volatility, factor or custom weights), " +
            "formed monthly, weekly or daily, from 1998 unless start_year " +
            "says otherwise; or pass a ticker list instead of the whole " +
            "market. Optional position rules: stop loss, trailing or " +
            "ATR stop, moving-average exit, cash buffer, random-book " +
            "controls. Returns full statistics (CAGR, Sharpe, max " +
            "drawdown and more), a decade table, a walk-forward split " +
            "against a benchmark (S&P 500 total return by default) and " +
            "one of three findings: confirmed, tradeoff or rejected. " +
            "Losing years and losing results are reported as they are. " +
            "A backtest is history, not a forecast or advice. Most " +
            "monthly runs answer in seconds; a slow run is collected " +
            "automatically and billed once, when the finished result " +
            "arrives. To find a documented strategy to test use " +
            "quantgpt#tools/search_library.",
        categories: ["equities"],
        notes: [
            "US$0.10 per finished backtest. A run that fails, is " +
            "refused, or never finishes inside the run budget is free.",
            "A key may have at most 2 backtests running at once; a third " +
            "is refused with a 429 that lists the running job ids.",
            "Re-running the same criteria within the result cache window " +
            "returns the same result.",
            "Daily rebalancing runs from 2016 and weekly from 1995; an " +
            "earlier start_year is clamped and the result says so.",
        ],
    },
    request: { method: "POST", path: "/tools/run_backtest" },
    input: { schema: { body: zRunBacktestBody.strict() } },
    /** The submit holds server-side for a while before it answers running,
     *  under the proxy's ~100 s ceiling. fetch_job long-polls, so a short
     *  cadence costs little. The whole-run budget leaves room for a slow
     *  daily-rebalance run; a job outliving it is abandoned unbilled. */
    timeouts: { requestMs: 95_000, runMs: 900_000, pollMs: 5_000 },
    lifecycle: {
        start: async ({ utils, logger }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                // a refusal (400 bad arguments, 404, 429 run line or busy,
                // 503 capacity): DATA, zero-billed by the engine
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.result.status");
            if (status !== "running") {
                // a fast run: the finished report came back in the call
                return { kind: "COMPLETED", httpStatus: 200, output: res.body };
            }
            const jobId = utils.json.optionalGet(res.body, "$.result.job_id");
            if (typeof jobId !== "string" || jobId === "") {
                // a running answer without a job id cannot be collected:
                // infrastructure failure, not data
                throw new Error("QuantGPT answered running without a job_id");
            }
            logger.info("quantgpt backtest running", { jobId });
            return { kind: "RUNNING", state: { externalRunId: jobId } };
        },
        poll: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) {
                throw Object.assign(
                    new Error("quantgpt poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const url = data.request.url;
            const res = await utils.http({
                method: "POST",
                url: url.slice(0, url.lastIndexOf("/") + 1) + "fetch_job",
                body: { job_id: jobId },
            });
            if (
                res.status === 429 || res.status === 500 ||
                res.status === 502 || res.status === 503 ||
                res.status === 504 ||
                (res.status >= 520 && res.status <= 524)
            ) {
                // the LOOKUP failed (a cap, a busy engine, the proxy), not
                // the job: keep the run alive and back off
                logger.warn("quantgpt fetch_job transient", {
                    jobId,
                    status: res.status,
                });
                return { kind: "RUNNING", pollAfterMs: 30_000 };
            }
            if (res.status < 200 || res.status >= 300) {
                // 400: the job failed or its id expired; 401 / 404: the
                // key or the API is gone. Terminal, zero-billed data.
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.result.status");
            if (status === "running") {
                // still computing: not a result, never a bill. Absent
                // state carries the job id forward (design D21).
                return { kind: "RUNNING" };
            }
            return { kind: "COMPLETED", httpStatus: 200, output: res.body };
        },
    },
    usage: {
        /** One flat line per FINISHED run (the only 2xx COMPLETED
         *  envelope this lifecycle emits); estimate and evidence are
         *  compiler-synthesized. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "finished backtest",
            consumes: { credit: "default", amount: 0.10 },
        },
    },
});
