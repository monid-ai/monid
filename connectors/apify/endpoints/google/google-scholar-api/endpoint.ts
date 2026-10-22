import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleScholarApiBody } from "./schema/inputs.ts";
import { zGoogleScholarApiOutput } from "./schema/output.ts";

/**
 * johnvc/google-scholar-api — Search Google Scholar.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Scholar",
        summary: "Google Scholar papers, citation formats, author profiles, " +
            "publication lists, and co-author networks.",
        description:
            "Queries Google Scholar in six modes: search research papers " +
            "with year, language, and type filters; fetch citation formats " +
            "(MLA, APA, Chicago, BibTeX) for a result; read an author's " +
            "profile with h-index and i10-index; list an author's articles; " +
            "view one article's citation history; or map co-authors. One " +
            "row per result.",
        docsUrl: "https://apify.com/johnvc/google-scholar-api",
        categories: ["academic-search"],
        notes: [
            "Billing: a one-time setup fee plus one query_executed event " +
            "per result page; the paginated modes (search, author_articles) " +
            "bill max_pages pages, the others one query.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/google-scholar-api",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~google-scholar-api/runs",
    },
    input: {
        schema: {
            body: zGoogleScholarApiBody.extend({
                // max_pages is the limiting knob of the paginated modes and
                // the actor documents 0 = no limit — floored at 1 with the
                // VERIFIED published default 1 (D25)
                max_pages: zGoogleScholarApiBody.shape.max_pages.unwrap().min(1)
                    .default(1),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zGoogleScholarApiOutput },
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
                    // vendor charge event: "apify-actor-start"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00001 },
                },
                setup: {
                    kind: UsageModelKind.PER_CALL,
                    label: "setup fee",
                    // vendor charge event: "setup"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.005 },
                },
                query_executed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "result pages",
                    // vendor charge event: "query_executed"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.014554 },
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
            const paginated = body.mode === "search" ||
                body.mode === "author_articles";
            // the actor hard-caps pagination at 50 pages (tier_policy.py:22)
            const pages = paginated ? Math.min(body.max_pages, 50) : 1;
            // page size: the caller's num, else the actor's per-mode default
            const perPage = body.num ??
                (body.mode === "author_articles" ? 20 : 10);
            return {
                counts: {
                    query_executed: pages,
                    default_dataset_item: paginated ? pages * perPage : 1,
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            const mode = utils.json.optionalGet(body, "$.mode");
            const paginated = mode === "search" || mode === "author_articles";
            const billed = rows.filter((row) =>
                utils.json.optionalGet(row, "$.error") !== true
            ).length;
            const cap = Math.min(
                utils.json.optionalNum(body, "$.max_pages") ?? 1,
                50,
            );
            const perPage = utils.json.optionalNum(body, "$.num") ??
                (mode === "author_articles" ? 20 : 10);
            // rows are results; pages are derived from the page size
            const pages = paginated
                ? Math.min(cap, Math.max(1, Math.ceil(billed / perPage)))
                : (billed > 0 ? 1 : 0);
            return {
                counts: {
                    query_executed: pages,
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
