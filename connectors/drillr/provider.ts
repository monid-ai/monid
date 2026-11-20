import { defineProvider, presets } from "@shared/core";

/**
 * drillr (drillr.ai, Little Grebe Inc.) — financial data for listed
 * companies in the US, mainland China and Japan. Every endpoint is ONE
 * synchronous JSON-over-HTTP call against
 * `https://gateway.drillr.ai/api/v2`, auth `X-API-KEY`.
 *
 * Billing is ONE pool — drillr's own credits wallet — drawn flat per
 * call at the REST rate card published on drillr.ai/docs/api ("Per-endpoint
 * rates", spec r116, read 2026-11-20):
 *
 *   - /company-discovery                3    credits per call
 *   - /news-search                      0.2  credits per call
 *   - /filing-search                    0.1  credits per call
 *   - every other endpoint              0.02 credits per call
 *     ("20 cr / thousand calls"; a multi-ticker request is still 1 call)
 *
 * The REST card is the source, not the MCP card on drillr.ai/docs/mcp:
 * the two differ (MCP `ticker_lookup` is free and `filing_list` is 0.1,
 * while REST `/tickers` and `/filings` each state 20 cr / thousand calls
 * on their own page). Errors and 429s are not billed upstream, which is
 * the engine's own posture for every non-2xx.
 *
 * NO `usage.consolidate`: drillr reports no meter. A live probe
 * (2026-11-20) found no usage or credit field in any response body and no
 * usage header, so the pinned PER_CALL lines are the whole settle and the
 * compiler synthesizes the empty quantities fns.
 *
 * Out of scope on purpose: watchlists, bookmarks and topics are per-user
 * state, and every Monid caller runs on one platform credential.
 */
export default defineProvider({
    name: "drillr",
    meta: {
        displayName: "drillr",
        summary: "Financial data for US, China and Japan listed companies: " +
            "filings, statements, ratios, events, and news.",
        description: "Financial data for listed companies in the US, " +
            "mainland China (Shanghai, Shenzhen, Beijing) and Japan: ticker " +
            "resolution, company discovery from a plain-language " +
            "description, filing lists and search inside filing text, " +
            "income statement, balance sheet and cash flow statement, " +
            "precomputed valuation and financial ratios, the earnings " +
            "calendar, news storylines, and for US companies the 8-K event " +
            "timeline and insider transactions. Rows that come from a " +
            "filing carry a link to the official document.",
        homepageUrl: "https://drillr.ai",
        docsUrl: "https://drillr.ai/docs",
        categories: ["equities"],
        notes: [
            "Tickers must be in drillr's canonical form. US: bare " +
            "upper-case symbol, share classes joined with a dash (`AAPL`, " +
            "`BRK-B`; not `BRK.B` or `AAPL.US`). China: six digits plus " +
            "`.SH`, `.SZ` or `.BJ` (`600519.SH`; not `600519` or " +
            "`600519.SS`). Japan: four-character code plus `.T` " +
            "(`7203.T`, `130A.T`; not `7203` or `7203.JP`).",
            "Company names are not resolved by the data endpoints. Call " +
            "`/tickers` with the name, ISIN, CIK or CUSIP first, or " +
            "`/company-discovery` when only a description is known, and " +
            "pass the returned `ticker` on.",
            "An error is `{error, message}` with `error` one of " +
            "`bad_request`, `unauthenticated`, `insufficient_credits`, " +
            "`not_found`, `rate_limit_exceeded`, `internal_error`, " +
            "`service_unavailable`. A ticker outside an endpoint's " +
            "coverage returns 404 and an unknown parameter returns 400; " +
            "both settle as provider errors with zero usage.",
            "The rate limit is 100 requests per minute per key; beyond it " +
            "the answer is 429 `rate_limit_exceeded` with " +
            "`retry_after_seconds` in the body.",
            "No endpoint filters by amount. Fetch the rows and filter " +
            "numeric fields on the caller's side.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-KEY") },
    request: { baseUrl: "https://gateway.drillr.ai/api/v2" },
    // sync provider, no poll loop. drillr publishes no latency figure for
    // the data endpoints; /company-discovery overrides (documented 20-60 s)
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** ONE pool: drillr's own credits wallet, shared by REST and MCP
         *  (drillr.ai/docs/api, "Per-endpoint rates"). Dollar conversion
         *  is plan-dependent and stays the broker card's job. */
        credits: { default: { label: "drillr credits" } },
    },
});
