import { defineProvider } from "@shared/core";
import { zBrightdataCredentials } from "./schema/auth.ts";

/**
 * Bright Data — web access infrastructure. Two products on ONE wire path
 * (`POST https://api.brightdata.com/request`, `Authorization: Bearer`),
 * told apart by the ZONE the request names: a `serp` zone answers search
 * engine result pages as parsed JSON, an `unblocker` zone answers arbitrary
 * URLs past bot detection. Both are synchronous.
 *
 * ZONE IS CREDENTIAL MATERIAL (design D1). The zone names a resource inside
 * the key-holder's account, so the caller cannot know it and must not set
 * it. It rides in `auth.credentials` beside the key and each endpoint's own
 * `auth.inject` merges the right one into the body at egress — the
 * contactout posture, and the reason there is no provider-level `inject`:
 * the two endpoints share a wire path, so the request alone cannot tell
 * which zone belongs to it.
 *
 * NO VENDOR METER (design D3). Verified live 2026-09-23 against a real key:
 * a successful `POST /request` returns the fetched payload and nothing
 * else — no credits field, no cost field, no usage header. `x-brd-debug`
 * (opt-in via `debug: true`) reports traffic counters, but it is a debug
 * aid rather than a billing receipt, it is a HEADER — which `record`
 * drops — and it is not documented as stable. So there is no
 * `usage.consolidate`; the derived fold IS the bill, and — eyes open — no
 * `usage.mismatch.derived` cross-check exists for Bright Data. The tests
 * pin the rates as literals (the contactout / clay D7a posture).
 *
 * DELIVERY IS THE BILLING SIGNAL, NOT THE ENVELOPE (design D4). Bright Data
 * bills per successful request, and most of the wire says which is which: a
 * request it could not accept answers non-2xx (400 `zone "x" not found`, 401
 * `Invalid token`) and the engine zero-bills it, while an unlock it
 * performed answers 200 whatever the target said — a target 404 arrives as a
 * 200 envelope carrying the target's status in `x-brd-status-code`, and it
 * is a billable unlock. But there is a third case, drilled live 2026-09-23:
 * Bright Data can ACCEPT a request, fail the unlock upstream, and still
 * answer 200 — with an EMPTY body and `x-brd-status-code: 502`. There
 * `isProviderError` is false, so the engine's zero-bill rule never fires,
 * and a flat per-call model would charge for a request that delivered
 * nothing. Headers do not reach a fn, but the empty payload does, so both
 * endpoints meter DELIVERY: a `PER_UNIT`/`RESULT` line settled 0|1 by
 * `usage.evidence` on whether a payload came back (litescrape's shape).
 *
 * ERRORS ARE PLAIN TEXT, and pass through untouched (design D5). Bright
 * Data answers a rejected request with a bare string body
 * (`Invalid token`), not a JSON envelope. The engine's sniffing decode
 * already renders that faithfully as a Json string and the status flags it,
 * so there is no `output.fromError`: digesting a one-line string into
 * `{message}` would add a shape without adding information.
 *
 * Nothing to strip either — the bodies carry no billing field — so no
 * `output.fromResponse`.
 */
export default defineProvider({
    name: "brightdata",
    meta: {
        displayName: "Bright Data",
        summary:
            "Search engine results as structured JSON, and any URL fetched past bot detection.",
        description: "Bright Data — web access infrastructure for agents. " +
            "SERP API returns a Google, Bing, Yandex or DuckDuckGo results " +
            "page as parsed JSON: organic results, knowledge panel, people " +
            "also ask, related searches and pagination, as fields rather " +
            "than markup. Web Unlocker API fetches any public URL past " +
            "CAPTCHAs, bot detection and geo-blocks, returning the target's " +
            "own HTML, clean markdown, or a PNG screenshot of the rendered " +
            "page. Both egress from a chosen country, retry a block rather " +
            "than returning an empty page, and charge only for requests " +
            "that complete.",
        homepageUrl: "https://brightdata.com",
        docsUrl: "https://docs.brightdata.com",
        categories: ["web-search", "web-scraping"],
        notes: [
            "Billing is per SUCCESSFUL request, and the envelope is the " +
            "signal: a request Bright Data could not complete answers " +
            "non-2xx and costs nothing.",
            "The TARGET's status code is not the envelope's. A page that " +
            "404s is still an unlock Bright Data performed and billed — " +
            "it answers 200, with the target's own status in the " +
            '`x-brd-status-code` response header. Send `format: "json"` ' +
            "to get that status code in the body instead.",
            "Both endpoints need a zone of the matching type on the " +
            "account. A SERP zone sent to an unblocker call (or the " +
            "reverse) is a 400, which is why the zone is credential " +
            "material and not a caller argument.",
        ],
    },
    auth: {
        /** Key + both zone names, one credential (design D1). No provider
         *  inject: the two endpoints share a wire path, so each states
         *  which zone it sends. */
        credentials: zBrightdataCredentials,
    },
    request: { baseUrl: "https://api.brightdata.com" },
    /** Unblocking is a retry loop against a hostile target, so the ceiling
     *  is generous: Bright Data's own guidance is to allow a couple of
     *  minutes for a hard page. `runMs` sits just above `requestMs` so the
     *  run never cuts off a request the transport still considers live. */
    timeouts: { requestMs: 120_000, runMs: 125_000 },
    usage: {
        /** THE credit system (design D26): Bright Data publishes no credit
         *  unit — it prices both products directly in dollars per 1,000
         *  requests — so the pool IS dollars, pinned at the published
         *  pay-as-you-go rate and re-audited on repricing (the exa / apify
         *  posture). */
        credits: { default: { label: "US dollars" } },
        // no `consolidate`: Bright Data reports no meter (design D3).
    },
});
