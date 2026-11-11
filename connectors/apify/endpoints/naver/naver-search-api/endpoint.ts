import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNaverSearchApiBody } from "./schema/inputs.ts";
import { zNaverSearchApiOutput } from "./schema/output.ts";

/**
 * johnvc/naver-search-api — Search Naver.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Naver",
        summary:
            "Scrape Naver web, news, image, video, and integrated search " +
            "results for Korean-market research.",
        description:
            "Searches Naver, Korea's largest search engine, for one or many " +
            "queries in the integrated, web, news, image, or video vertical " +
            "and returns structured results with title, URL, snippet, " +
            "source, date, and position, paginating up to the per-query " +
            "cap. One row per result.",
        docsUrl: "https://apify.com/johnvc/naver-search-api",
        categories: ["web-search", "news-search"],
        notes: [
            "Billing: one query_searched event per query plus one " +
            "result_scraped event per result row; the actor-start line is " +
            "the sum of the platform start event and the actor's own " +
            "actor_start event (both fire once per run).",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/naver-search-api",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~naver-search-api/runs",
    },
    // the actor's own published default run timeout exceeds the
    // provider's 300 s budget (defaultRunOptions.timeoutSecs, 2026-09-22)
    timeouts: { runMs: 1_200_000 },
    input: {
        schema: {
            body: zNaverSearchApiBody.extend({
                // the vertical and the limiting knob at the actor's VERIFIED
                // published defaults (D25)
                where: zNaverSearchApiBody.shape.where.unwrap().default(
                    "nexearch",
                ),
                maxResultsPerQuery: zNaverSearchApiBody.shape.maxResultsPerQuery
                    .unwrap().default(30),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zNaverSearchApiOutput },
    usage: {
        /** The WHOLE published card (design D29): every charge event the
         *  actor publishes is a line, ids normalize from the event names
         *  (D28), amounts are the Business-tier rates. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "actor start",
                    description:
                        "the platform start event ($0.00001) plus the actor's own " +
                        "actor_start ($0.00005)",
                    // vendor charge event: "apify-actor-start + actor_start"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00006 },
                },
                query_searched: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "queries",
                    // vendor charge event: "query_searched"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.0136 },
                },
                result_scraped: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "results",
                    // vendor charge event: "result_scraped"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.003 },
                },
                default_dataset_item: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "stored rows",
                    description:
                        "the platform's per-row dataset charge — every pushed " +
                        "row, error rows included",
                    // vendor charge event: "apify-default-dataset-item"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00001 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const queries = (body.query ? 1 : 0) + (body.queries?.length ?? 0);
            const results = body.maxResultsPerQuery * queries;
            return {
                counts: {
                    query_searched: queries,
                    result_scraped: results,
                    default_dataset_item: results,
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            // result rows AND the no_results marker row bill result_scraped;
            // error rows do not (src/main.py:225-247, 2026-09-22)
            const billed = rows.filter((row) =>
                utils.json.optionalGet(row, "$.result_type") !== "error"
            );
            // queries = distinct query echoes on the billed rows; a body
            // with no echo still ran one query when anything was billed
            const echoes = billed
                .map((row) => utils.json.optionalStr(row, "$.query") ?? "")
                .filter((query) => query !== "");
            const seen = echoes.filter((query, i) =>
                echoes.indexOf(query) === i
            );
            const inputQueries =
                (utils.json.optionalStr(body, "$.query") !== undefined
                    ? 1
                    : 0) +
                (utils.json.optionalLen(body, "$.queries") ?? 0);
            const queries = seen.length > 0
                ? seen.length
                : (billed.length > 0 ? Math.max(1, inputQueries) : 0);
            return {
                counts: {
                    query_searched: queries,
                    result_scraped: billed.length,
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
