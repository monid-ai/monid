import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleJobsScraperBody } from "./schema/inputs.ts";
import { zGoogleJobsScraperOutput } from "./schema/output.ts";

/**
 * johnvc/Google-Jobs-Scraper — Search Google Jobs.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Jobs",
        summary: "Scrape Google Jobs listings by query and location with " +
            "company, salary, apply links, and full descriptions.",
        description:
            "Searches Google Jobs and returns job postings with title, " +
            "company, location, posting age, salary where shown, schedule " +
            "type, the full description, and apply links across the job " +
            "boards Google aggregates. Supports country and language " +
            "targeting, a posted-within window, location radius, and " +
            "pagination. One row per job.",
        docsUrl: "https://apify.com/johnvc/Google-Jobs-Scraper",
        categories: ["jobs"],
        notes: [
            "Billing is per result page fetched (about 10 jobs per page); a " +
            "page is charged only when it yields at least one job, so the " +
            "settled page count is derived from the delivered jobs and can " +
            "under-count sparse pages.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/google-jobs-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~Google-Jobs-Scraper/runs",
    },
    input: {
        schema: {
            body: zGoogleJobsScraperBody.required({ num_results: true })
                .extend({
                    // max_pagination 0 is the actor's own default and
                    // means "no page cap" (num_results bounds the run)
                    max_pagination: zGoogleJobsScraperBody.shape.max_pagination
                        .unwrap().default(0),
                }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zGoogleJobsScraperOutput },
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
                page_processed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "result pages",
                    // vendor charge event: "page_processed"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.035 },
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
            const byResults = Math.ceil(body.num_results / 10);
            const pages = body.max_pagination > 0
                ? Math.min(body.max_pagination, byResults)
                : byResults;
            return {
                counts: {
                    page_processed: pages,
                    default_dataset_item: Math.min(
                        body.num_results,
                        pages * 10,
                    ),
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            const jobs = rows.filter((row) =>
                utils.json.optionalGet(row, "$.error") !== true
            ).length;
            const wanted = utils.json.optionalNum(body, "$.num_results") ?? 0;
            const capPages = utils.json.optionalNum(body, "$.max_pagination") ??
                0;
            const byResults = Math.ceil(wanted / 10);
            const cap = capPages > 0
                ? Math.min(capPages, byResults)
                : byResults;
            // rows are jobs (~10 per page); a page bills only once it
            // yields a job — the page count is derived, never observed
            return {
                counts: {
                    page_processed: Math.min(cap, Math.ceil(jobs / 10)),
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
