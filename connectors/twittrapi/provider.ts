import { defineProvider, presets, Unit, UsageModelKind } from "@shared/core";

/**
 * TwittrAPI (twittrapi.com) — public X (Twitter) data over REST: tweet
 * search, tweets and their reply threads, quotes and retweeters, profiles,
 * timelines, followers and following, lists, communities and trends.
 * Synchronous GETs on ONE host (`https://api.twittrapi.com`) with ONE key in
 * the `X-API-KEY` header — the litescrape shape: every provider-wide hook
 * lives here and the endpoints are pure data (meta + path + input schema).
 * Submitted by the vendor.
 *
 * WIRE FORMAT: every read endpoint answers X's raw GraphQL JSON by default,
 * or — with `format=simple` — a compact, flat camelCase envelope with a
 * fixed schema at the same price: `{data, nextCursor, previousCursor,
 * hasNextPage}` for pages and `{data}` for single objects
 * (https://www.twittrapi.com/docs/simple-format). The connector always asks
 * for the simple format (`input.toRequest` below appends it), so the format
 * knob is not part of any input schema and every output is the simple
 * envelope, relayed verbatim (no `fromResponse`). `nextCursor` is an opaque
 * string, not a URL: the caller passes it back as `cursor` to read the next
 * page, so paging stays honest (one run = one page = one vendor call).
 *
 * BILLING (https://www.twittrapi.com/pricing.json, captured 2026-10-15):
 * one billed unit is one API call — a lookup returns one object, and
 * search, timeline and follower calls return one page — at a flat price on
 * every endpoint: $0.10 per 1,000 calls at the Standard tier
 * (`usdPerCall: 0.0001`; Volume/Scale/Bulk tiers go down to $0.065 per
 * 1,000 by top-up volume). The balance is kept in US dollars (`GET
 * /balance` → `balance`, `price_per_call` in USD), so the pool IS dollars
 * (the exa / dataforseo posture) and every endpoint draws the pinned
 * Standard list price. The vendor bills a 200 even when the page is empty;
 * this connector records 0 for a 200 whose `data` is empty or null (the
 * search1api / litescrape posture: Monid absorbs the empty call), so the
 * line is `PER_UNIT · PAGE` settled 0|1 off the body rather than a flat
 * `PER_CALL`. Non-2xx answers are zero-billed by the engine (the vendor
 * itself refunds 400/408/409/5xx and never charges 401/402/403/429). No
 * response body carries a meter (the vendor's `X-Remaining-Balance` and
 * `X-Price-Per-Call` are HEADERS), so there is no `consolidate`: the
 * derived fold is the bill.
 */
export default defineProvider({
    name: "twittrapi",
    meta: {
        displayName: "TwittrAPI",
        summary: "Public X (Twitter) data: tweet search, tweets, replies, " +
            "profiles, timelines, followers, lists, communities, trends.",
        description: "Read public X (Twitter) data without an X developer " +
            "account: search tweets or people with the full X search " +
            "syntax, read a tweet with its reply thread, its quote tweets " +
            "and the accounts that retweeted it, look up profiles by " +
            "handle or in batches of up to 100 ids, read a profile's " +
            "tweets, replies and media, page through followers, following " +
            "and verified followers, read X Lists and their members, find " +
            "Communities, and get trending topics by location. Every " +
            "response is compact flat JSON (camelCase tweets and users) " +
            "with one page per call and a `nextCursor` to pass back as " +
            "`cursor` for the next page. Flat price per call on every " +
            "endpoint. Read-only: no posting, liking or following.",
        homepageUrl: "https://www.twittrapi.com",
        docsUrl: "https://www.twittrapi.com/docs",
        categories: ["twitter"],
        /** Provider-wide caveats (concatenated before each endpoint's). */
        notes: [
            "One run is one page: list endpoints return `{data, " +
            "nextCursor, previousCursor, hasNextPage}`. To read further, " +
            "run the same endpoint again with `cursor` set to the previous " +
            "`nextCursor`; it is null on the last page. Each page is billed " +
            "separately.",

            "`count` is a hint passed to X as is: X decides how many items " +
            "a page holds (follower and following pages often carry 50 to " +
            "70 users for count=20), so do not rely on an exact page size.",

            "Usage records 0 for a 200 whose `data` is empty or null (for " +
            "example a handle that does not exist, or a timeline with no " +
            "entries). Every non-2xx (401 bad key, 402 balance empty, 404 " +
            "object not found, 422 invalid value, 429 rate limit, 5xx) " +
            "settles as a provider error with zero usage.",

            "Numeric ids (tweet, user, list) are returned as strings; pass " +
            "them back as strings.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-KEY") },
    request: {
        baseUrl: "https://api.twittrapi.com",
        /** The API sits behind Cloudflare, which rejects some generic
         *  library user agents; a stable, descriptive one is pinned. */
        headers: {
            Accept: "application/json",
            "User-Agent": "monid-connector-twittrapi/1.0 (+https://monid.ai)",
        },
    },
    /** The vendor answers 408 (refunded) after 60 s; the request budget
     *  sits just above it so the vendor's own verdict arrives as data. */
    timeouts: { requestMs: 65_000, runMs: 70_000 },
    input: {
        /** The wire profile every endpoint inherits: list parameters (`ids`)
         *  go out as ONE comma-separated value (the vendor's `explode:
         *  false`), the search `filters` object goes out JSON-encoded (the
         *  vendor documents it as a URL-encoded JSON object), and
         *  `format=simple` is appended so every answer is the flat
         *  envelope. The engine only knows repeated keys and refuses
         *  objects, so both spellings are this vendor's to make here. */
        toRequest: ({ data }) => ({
            ...data.input,
            queryParams: {
                ...Object.fromEntries(
                    Object.entries(data.input.queryParams ?? {}).map((
                        [key, value],
                    ) => [
                        key,
                        Array.isArray(value)
                            ? value.join(",")
                            : value !== null && typeof value === "object"
                            ? JSON.stringify(value)
                            : value,
                    ]),
                ),
                format: "simple",
            },
        }),
    },
    output: {
        /** TwittrAPI error body: `{error, errorCode?, errorInfo?,
         *  attempts?}` — `error` is the human message (the vendor asks
         *  clients to key on the status code, not the text). Runs only on
         *  provider-error envelopes, after the engine forced zero usage;
         *  the raw body rides under `raw`. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.error");
            const code = utils.json.optionalGet(data.output, "$.errorCode");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "TwittrAPI error",
                ...(typeof code === "string" ? { errorCode: code } : {}),
                raw: data.output,
            };
        },
    },
    usage: {
        /** THE credit system (design D26): TwittrAPI keeps a prepaid
         *  balance in US dollars, so the pool is dollars — one pool ⇒ id
         *  `default`. */
        credits: { default: { label: "US dollars" } },
        /** One rate card for every endpoint: $0.0001 per call (Standard
         *  tier, $0.10 per 1,000 — https://www.twittrapi.com/pricing.json,
         *  captured 2026-10-15), counted 0|1 per page by the evidence
         *  below. Endpoints inherit it and override nothing. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            label: "pages with results",
            description: "calls whose response carried at least one item " +
                "in `data`",
            consumes: { credit: "default", amount: 0.0001 },
        },
        /** Every run is exactly one vendor call (no fan-out, no follow-up
         *  reads), so the hold is one page. */
        estimate: () => ({ counts: { PAGE: 1 } }),
        /** 1 when the simple envelope's `data` holds something — a
         *  non-empty array (pages) or an object (single lookups); 0 for an
         *  empty page or `data: null` (a handle that does not exist). The
         *  vendor still charges those; Monid absorbs them. */
        evidence: ({ data, utils }) => {
            const page = utils.json.optionalGet(data.output, "$.data");
            const hit = Array.isArray(page)
                ? (page.length > 0 ? 1 : 0)
                : page !== null && page !== undefined &&
                        typeof page === "object"
                ? 1
                : 0;
            return { counts: { PAGE: hit } };
        },
    },
});
