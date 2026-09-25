import { defineProvider, presets } from "@shared/core";

/**
 * Lumify (lumify.ai) — an agent-ready sports intelligence API. One wire
 * surface, `https://lumify.ai/v1/<path>`, Bearer auth (`Authorization:
 * Bearer lmfy-...`). Synchronous JSON: schedules with status/period/clock,
 * current multi-book odds, public betting splits, and per-event bet
 * intelligence, plus team and player reference data. Results come back
 * inline; nothing polls. (Lumify also publishes score, odds-history, and
 * SSE endpoints not yet ported here — see the PR for scope.)
 *
 * BILLING. Lumify meters usage in a single pool of account CREDITS. The
 * vendor's own meter is the `X-Credits-Used` response header
 * (https://lumify.ai/docs, 2026-09-23), which hook fns cannot read — so
 * there is no `usage.consolidate`. List/lookup endpoints (sports, events,
 * teams, players) pin a flat PER_CALL draw of one credit, the published
 * floor when the call succeeds. Event-scoped reads that can return
 * `available: false` (odds, splits, intelligence) are PER_UNIT on that
 * flag: a 200 with `available: false` is `X-Credits-Used: 0` and settles
 * at zero; `available: true` settles at one credit (the fallback
 * rate-card amount). Intelligence is the one exception to a plain
 * `available` check: `forecasts[]` can be nonempty while `available` is
 * still false, and that response IS charged — free requires
 * `available: false` AND `forecasts` empty together. The $/credit of the
 * plan is the hosted rate card's job, not the connector's.
 *
 * Errors are real non-2xx `{ error: { code, message, status, doc_url },
 * detail }` bodies — `output.fromError` digests them; the engine zero-bills
 * every non-2xx envelope.
 */
export default defineProvider({
    name: "lumify",
    meta: {
        displayName: "Lumify",
        summary:
            "Agent-ready sports data: schedules and status, multi-book odds, public betting splits, and bet intelligence.",
        description: "The sports intelligence API for agents — list sports " +
            "and events with schedule/status, pull current multi-book odds, " +
            "see how the public is betting with money and ticket splits, get " +
            "per-event bet intelligence, and resolve team and player " +
            "reference data. One key, one JSON surface, no scrapers or " +
            "per-book integrations to run.",
        homepageUrl: "https://lumify.ai",
        docsUrl: "https://lumify.ai/docs",
        categories: ["sports-data", "sports-betting"],
        notes: [
            "Failed requests are not billed: the engine zero-bills every " +
            "non-2xx response.",
            "Odds and splits return HTTP 200 with available: false (and " +
            "X-Credits-Used: 0) when the data is not ready, and settle at " +
            "zero credits. Intelligence does too, UNLESS forecasts is " +
            "nonempty — a forecasts-only response is still charged.",
            "A call's credit draw varies with the data available at request " +
            "time; the account's estimate endpoint returns the min/max " +
            "credits for a planned call before you make it.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://lumify.ai/v1" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system: Lumify meters ONE pool of account API credits,
         *  so the pool is that unit and the id is `default`. The $/credit of
         *  the plan is the hosted rate card's job, not the doc's. */
        credits: {
            default: {
                label: "Lumify credits",
                description:
                    "the account's Lumify API credit balance; each call " +
                    "draws from it",
            },
        },
    },
    output: {
        /** Lumify errors are real non-2xx `{ error: { code, message,
         *  status, doc_url }, detail }` bodies. Runs only on provider
         *  errors, after zero-usage forcing; the raw body rides under
         *  `raw` — digest, never hide. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const detail = utils.json.optionalGet(data.output, "$.detail");
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : typeof detail === "string" && detail !== ""
                    ? detail
                    : "Lumify API error",
                ...(typeof code === "string" ? { error_code: code } : {}),
                raw: data.output,
            };
        },
    },
});
