import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFetchBody } from "../../schema/fetch.ts";

/**
 * `POST /v1/fetch` with a GET — read any URL and get the page back as
 * clean, LLM-ready Markdown. String's `/v3` fetch tool, ported: a GET and
 * nothing else, Markdown by default, and challenge solving off unless
 * the caller asks. A body, and every method that can change data on the
 * destination, is `string#request`.
 *
 * BILLING, from String's own published docs (pricing.mdx "Usage — per
 * 1,000 requests" and api-reference/overview.mdx "Billed request type",
 * read 2026-10-24): the rate is one of four flat per-request lines,
 * named by the RESPONSE header `x-billed-request-type` —
 * `request_standard` / `request_premium` / `browser_standard` /
 * `browser_premium` — plus `search`, for a Google results URL that
 * `/fetch` answered through Search at the search rate. This is
 * OUTPUT-determined, not input-gated: `executeJS` forces the browser
 * path, but the proxy class (standard vs. premium) is picked per
 * destination and is only known once the response names it. Quoted at
 * the Growth-tier rate throughout, matching the search endpoint's own
 * pricing decision.
 *
 * WHY LIFECYCLE, NOT DECLARATIVE: `x-billed-request-type` is a response
 * HEADER, and this DSL's declarative path drops headers before
 * `usage.evidence` ever runs — `engine/transport.ts`'s `sniffDecode`
 * takes only `response.body`, and `usage.evidence`'s envelope
 * (`zEnvelopeData`) carries `output` (the decoded body) but no headers
 * field; confirmed by reading both, not assumed. `lifecycle.start` DOES
 * see response headers (`utils.request()` returns `{status, headers,
 * body}`), so this endpoint uses a single-tick lifecycle (no `poll` —
 * `/fetch` is a synchronous vendor call, no job id — the non-polling
 * COMPLETED branch) and stashes the header on `state.data`, the
 * documented billing-signal channel (`data.lifecycle.state.data`) for
 * `usage.evidence` to read.
 *
 * ESTIMATE: the browser-vs-request axis is knowable from the request
 * (`executeJS` forces browser); the proxy-class axis is not, so this
 * promises the cheaper (standard) proxy on whichever strategy the
 * request implies — an honest floor, not a worst case, for an
 * output-determined quantity.
 *
 * SETTLE: reads `x-billed-request-type` off `state.data` (stashed by
 * `lifecycle.start`) and bills it when it names one of this doc's own
 * lines. A transport that does not surface response headers (the DSL's
 * own documented fallback, `TransportResponse.headers` being optional)
 * settles zero rather than guessing which line fired. The lifecycle and
 * evidence fns are byte-identical to `string#request`'s, which reads the
 * same header, so the two endpoints share one fnTable entry for each.
 */
export default defineEndpoint({
    meta: {
        displayName: "String Web Access Fetch",
        summary: "Read any URL with a GET and get the page back as clean, " +
            "LLM-ready Markdown.",
        description: "Fetch a URL with a GET and get the page back as " +
            "clean, LLM-ready Markdown, the default `format`. `raw` " +
            "returns the destination's body exactly as it was sent, and " +
            "`json` an envelope with the destination's own `statusCode` " +
            "and `headers` beside the page as `data`. It reads the page " +
            "and changes nothing on the destination. To send a body (a " +
            "POST, PUT or PATCH), use `string#request`; to find pages " +
            "when you have no URL, use `string#search`.",
        docsUrl: "https://portal.usestring.ai/docs/api-reference/fetch",
        categories: ["web-scraping", "web-extraction"],
        notes: [
            "`headers` cannot be combined with `executeJS`.",
            "A destination error such as a `404` is a successful call: it " +
            "comes back inside a `200` and is billed. With `markdown` or " +
            "`raw` the output is the page alone; ask for `format: " +
            '"json"` to get the destination\'s `statusCode` with it.',
            "A Google results URL is answered as structured search " +
            "results and billed at the search rate.",
            "AI structured extraction (`jsonSchema`) is not exposed by " +
            "this connector — its surcharge scales with page and " +
            "schema size with no published flat rate.",
            "String can still bill a destination TLS/SSL failure when " +
            "an earlier attempt already did billable work; that `502` " +
            "names its class in `x-billed-request-type`. This connector " +
            "settles every non-2xx at zero usage, so such a charge is not " +
            "passed through.",
        ],
    },
    request: { method: "POST", path: "/fetch" },
    // Rendered fetches run far longer than a plain request; no published
    // SLA, so this budgets generously rather than truncating a
    // slow-but-successful fetch.
    timeouts: { requestMs: 60_000, runMs: 65_000 },
    input: {
        schema: {
            body: zFetchBody.pick({
                url: true,
                format: true,
                executeJS: true,
                headers: true,
                countryCode: true,
                solveCaptcha: true,
            }).extend({
                format: zFetchBody.shape.format.unwrap().describe(
                    "'markdown' (the default here) for the page as clean " +
                        "Markdown, 'raw' for the destination's body as it " +
                        "was sent, or 'json' for an envelope with the " +
                        "destination's statusCode and headers and the " +
                        "page as data.",
                ).default("markdown"),
                solveCaptcha: zFetchBody.shape.solveCaptcha.unwrap().describe(
                    "false (the default here) fails the call on a " +
                        "challenge page. true has the request attempt the " +
                        "challenge, where the key is allowed to.",
                ).default(false),
            }),
        },
    },
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            const billedType = res.headers["x-billed-request-type"];
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
                state: { data: { billedRequestType: billedType ?? null } },
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                request_standard: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "request-based, standard proxy",
                    description: "a plain fetch on a standard proxy",
                    consumes: { credit: "default", amount: 0.0002 },
                },
                request_premium: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "request-based, premium proxy",
                    description: "a plain fetch on a premium " +
                        "(residential) proxy",
                    consumes: { credit: "default", amount: 0.002 },
                },
                browser_standard: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "browser-based, standard proxy",
                    description: "a browser-rendered fetch on a " +
                        "standard proxy",
                    consumes: { credit: "default", amount: 0.001 },
                },
                browser_premium: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "browser-based, premium proxy",
                    description: "a browser-rendered fetch on a " +
                        "premium (residential) proxy",
                    consumes: { credit: "default", amount: 0.004 },
                },
                search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "search",
                    description: "a Google results URL answered through " +
                        "Search, at the search rate",
                    consumes: { credit: "default", amount: 0.001 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    [
                        body.executeJS === true
                            ? "browser_standard"
                            : "request_standard"
                    ]: 1,
                },
            };
        },
        evidence: ({ data, utils }) => {
            // closed-term fn: the billed lines are read off this doc's
            // own model rather than a module-level const (the compiler
            // rejects a free identifier reference from inside a hook fn),
            // so string#request's identical copy bills only its own.
            const model = data.usage.model;
            const lines = model.kind === "COMPOSITE"
                ? Object.keys(model.components)
                : [];
            const billedType = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.billedRequestType",
            );
            if (typeof billedType === "string" && lines.includes(billedType)) {
                return { counts: { [billedType]: 1 } };
            }
            return { counts: {} };
        },
    },
});
