import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/search` — search the web and get Google's ranked results back,
 * with the rest of the results page beside them, or Google AI Mode's
 * answer. The binding offers the engines String's `/v3` search tool does,
 * `google` and `google_ai_mode` (its `aiMode`); the mirror keeps the
 * vendor's full list.
 *
 * BILLING, from String's own published docs (not third-party reverse
 * engineering — get-started/pricing and api-reference/search on
 * portal.usestring.ai/docs, read 2026-10-24). Two lines at the search
 * rate:
 *   - `search`: each results page that answered is one search. Without
 *     `searchCount`, a call is exactly one page, and so is every AI Mode
 *     answer and every `format: "raw"` call. With it, Google is paged (up
 *     to 36 pages) until `searchCount` organic results are collected, and
 *     the response's `paging.pages` counts the pages that answered.
 *   - `ai_overview`: `aiOverview: true` makes "a second, sequential fetch"
 *     to fill the AI overview, and "costs 2x a normal search" — billed on
 *     the first page only, so it is one search more whatever the page
 *     count. Input-gated, so it is its own line: folded into `search`, the
 *     estimate would go silently wrong the moment a caller set it.
 *
 * ESTIMATE is an admission hold, not a best guess: it must not undershoot
 * what settlement can actually charge. Without `searchCount`, 1 page.
 * With it, on `google` (the default when `engine` is omitted): String's
 * docs describe a hard 36-page cap and settlement reads whatever
 * `paging.pages` the response reports, which can land anywhere up to that
 * cap — so the hold reserves the full 36 rather than a per-page-count
 * heuristic that could settle under what it promised. AI Mode never
 * pages, so it always estimates 1.
 *
 * SETTLE: reads `paging.pages` from the response when present (String
 * only sends it when `searchCount` was in the request); otherwise 1. A
 * `format: "raw"` response is the results page as HTML, so the path is
 * absent and it settles at 1 too.
 *
 * NOTHING BACK, NOTHING BILLED: a search that comes back with nothing for
 * the caller settles at zero, as Monid absorbs a run that returns no
 * results. String itself still bills it (a recorded no-match search
 * carries `x-billed-request-type: search`). "Nothing" is Google reporting
 * no match (`zeroResults: true`), or a response whose `results` and every
 * other part of the page are empty — an AI Mode answer, a local pack or
 * an images tab with empty `results` still answered, and still bills.
 *
 * PRICING: String's rate is plan-tier USD ($1.50/1,000 on Starter, $1.00/
 * 1,000 on Growth — portal.usestring.ai/docs/get-started/pricing
 * "Search", retrieved 2026-10-24), not a vendor "credits" abstraction, and
 * the response carries no billing receipt to read at settle time. Quoted
 * here at the Growth-tier rate ($0.001/search) — a deliberate choice, not
 * a guess.
 */
export default defineEndpoint({
    meta: {
        displayName: "String Web Access Search",
        summary: "Search the web and get Google's ranked results, the " +
            "rest of the results page, or an AI Mode answer.",
        description: "Search the web for a query and get Google's ranked " +
            "organic results back, with whatever else the results page " +
            "showed beside them: a panel for the business or person the " +
            "query names, local listings, AI overviews, People also ask, " +
            "related searches, videos and discussions. `searchType` " +
            "searches Google's images, videos, shopping, books, places or " +
            'forums tab instead, and `engine: "google_ai_mode"` returns ' +
            "Google AI Mode's answer and the pages it cites. A call is one " +
            "results page of about 10 results; `searchCount` (1-300) pages " +
            "Google until that many are collected, and each page is billed " +
            "as one search. It reads search results only and changes " +
            "nothing. A snippet is not the page: to read a result, call " +
            "`string#fetch` on its `url`, and start there if you already " +
            "have the URL.",
        docsUrl: "https://portal.usestring.ai/docs/api-reference/search",
        categories: ["web-search", "ai-search", "image-search", "video-search"],
        notes: [
            '`searchCount` is rejected with `format: "raw"` and with ' +
            '`engine: "google_ai_mode"`; ask for a later page with ' +
            "`page` instead.",
            "`page` and `searchCount` together stay within the first 300 " +
            "results: (page - 1) x 10 + (`searchCount`, or 10 without it) " +
            "must be at most 300.",
            'With `engine: "google_ai_mode"`, only `query`, `country`, ' +
            "`language`, `location` and `coordinates` apply; any other " +
            "field is rejected.",
            "`dateRange`, `sortBy` and `verbatim` apply to `searchType` " +
            'web, videos and forums only, and `format: "raw"` and ' +
            "`aiOverview` to web only. `shopping` has one page, so `page` " +
            "must be 1; `images` has 3 pages and `places` 15.",
            "A `searchCount` search that runs out of its 45-second budget, " +
            "or hits a later page that fails, still answers 200 with what " +
            "it collected: `paging.complete` is false, and only the pages " +
            "that answered are billed.",
            "If an AI Mode answer isn't available for a query, the call " +
            "fails and settles at zero; retry, or search without it.",
        ],
    },
    request: { method: "POST", path: "/search" },
    input: {
        schema: {
            body: zSearchBody.extend({
                engine: zSearchBody.shape.engine.unwrap()
                    .extract(["google", "google_ai_mode"])
                    .describe(
                        "'google' (the default) for ranked results and the " +
                            "rest of the results page, or 'google_ai_mode' " +
                            "for Google AI Mode's generated answer and the " +
                            "pages it cites.",
                    ).default("google"),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search pages",
                    description: "each results page that answered, billed " +
                        "as one search, at the Growth-tier rate " +
                        "($1.00/1,000)",
                    consumes: { credit: "default", amount: 0.001 },
                },
                ai_overview: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "AI overview fill",
                    description: "the second fetch `aiOverview: true` " +
                        "makes on the first results page, billed as one " +
                        "more search",
                    consumes: { credit: "default", amount: 0.001 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const aiOverview = body.aiOverview === true ? 1 : 0;
            if (body.engine !== "google" || body.searchCount === undefined) {
                return { counts: { search: 1, ai_overview: aiOverview } };
            }
            // Hold the documented 36-page cap, not a per-page-count
            // guess: settlement reads the real `paging.pages` and must
            // never be able to charge more than this hold reserved.
            return { counts: { search: 36, ai_overview: aiOverview } };
        },
        evidence: ({ data, utils }) => {
            const output = data.output;
            const nothing = typeof output === "object" && output !== null &&
                !Array.isArray(output) &&
                (output.zeroResults === true ||
                    Object.entries(output).every(([key, value]) =>
                        key === "zeroResults" || key === "paging" ||
                        value === null ||
                        (Array.isArray(value)
                            ? value.length === 0
                            : typeof value === "object" &&
                                Object.keys(value).length === 0)
                    ));
            if (nothing) {
                return { counts: { search: 0, ai_overview: 0 } };
            }
            const pages = utils.json.optionalNum(output, "$.paging.pages");
            const body = data.input.body;
            return {
                counts: {
                    search: pages ?? 1,
                    ai_overview: body.aiOverview === true ? 1 : 0,
                },
            };
        },
    },
});
