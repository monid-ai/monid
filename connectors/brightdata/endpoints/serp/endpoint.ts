import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBrightdataSerpBody } from "./schema/inputs.ts";

/**
 * Bright Data SERP API — a search engine results page, parsed.
 *
 * Shares the `POST /request` wire path with `brightdata#unlocker`, so the
 * id is DECLARED rather than derived: omitting `endpoint` would collide the
 * two on `brightdata#request` (AGENT.md; the contactout twin posture).
 *
 * `auth.inject` is spelled inline because neither preset fits — the bearer
 * preset reads `data.params.apiKey` and stops there, and this endpoint must
 * also merge the SERP zone into the body at egress (design D1). The
 * unlocker twin's inject is the same shape over `unlockerZone`, so the two
 * sources differ and intern to two fnTable entries; that is the honest
 * outcome, since the zone field they read is the whole difference between
 * the two products.
 *
 * FLAT PER-REQUEST BILLING (design D6): Bright Data prices SERP API at
 * $1.50 per 1,000 requests pay-as-you-go — $0.0015 a call, whatever the
 * page returns. Result count does not enter the bill, so there is no
 * metered line and no quantities fn to author: the compiler synthesizes the
 * one lawful empty counts fn for a flat model and the engine appends the
 * flat 1 under `CALL`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Bright Data SERP API",
        summary:
            "Search Google, Bing, Yandex or DuckDuckGo and read the results page as JSON.",
        description: "Run a live search on Google, Bing, Yandex or " +
            "DuckDuckGo and get the results page back as structured JSON — " +
            "`organic` (link, title, description, rank, display link), plus " +
            "`knowledge`, `people_also_ask`, `related`, `pagination` and a " +
            "`general` block carrying the result count and the engine's own " +
            "reading of the query. Pass the engine url with the query in " +
            "it and `brd_json=1` appended; without that switch the page " +
            "comes back as HTML. Results are fetched live per call and " +
            "never served from a cache, so prices, rankings and news are " +
            "current at query time, and the search runs from real " +
            "consumer-grade IPs in the country you name — which is what " +
            "makes localized results actually localized rather than a US " +
            "page with a language flag. Use this to see what a search " +
            "engine really returns today; to fetch one of the result pages " +
            "afterwards, reach for the Bright Data Web Unlocker endpoint.",
        docsUrl:
            "https://docs.brightdata.com/api-reference/rest-api/serp/serp-api",
        categories: ["web-search"],
    },
    /** Declared: the wire path is shared with the unlocker twin. */
    endpoint: "/serp",
    request: { method: "POST", path: "/request" },
    auth: {
        inject: ({ data, utils }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                Authorization: "Bearer " + data.params.apiKey,
            },
            // `merge`, not a spread: `request.body` is Json, whose union
            // includes primitives, so the spread does not type. merge is
            // the shape-tolerant primitive for exactly this.
            body: utils.json.merge(data.request.body ?? {}, {
                zone: data.params.serpZone,
            }),
        }),
    },
    input: { schema: { body: zBrightdataSerpBody } },
    usage: {
        // $1.50 / 1,000 requests, Bright Data's published pay-as-you-go
        // rate for SERP API (brightdata.com/pricing/serp,
        // read 2026-09-23), counted 0|1 by the evidence below: a 200 that
        // delivered no payload is an upstream failure, not a billable
        // request (design D4).
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "delivered requests",
            description: "requests that came back carrying a payload",
            consumes: { credit: "default", amount: 0.0015 },
        },
        /** One request is promised; whether it DELIVERS is the settle's
         *  question, never the estimate's. */
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Design D4. Bright Data can accept a request, fail the unlock
         *  upstream, and still answer 200 — with an EMPTY body and the
         *  real status in `x-brd-status-code` (a 502 was drilled live
         *  2026-09-23). Headers do not reach a fn, but the empty payload
         *  does: the sniffing decode renders it as `null`. So delivery is
         *  read off the payload itself — a null, or a blank string, is
         *  nothing delivered and draws nothing. This source is identical
         *  on both endpoints and interns to one fnTable entry. */
        evidence: ({ data }) => {
            const body = data.output;
            const blank = body === null ||
                (typeof body === "string" && body.trim() === "");
            return { counts: { RESULT: blank ? 0 : 1 } };
        },
    },
});
