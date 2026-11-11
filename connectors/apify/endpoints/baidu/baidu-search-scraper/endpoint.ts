import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBaiduSearchScraperBody } from "./schema/inputs.ts";
import { zBaiduSearchScraperOutput } from "./schema/output.ts";

/**
 * johnvc/Baidu-Search-Scraper — Search Baidu.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Baidu",
        summary:
            "Scrape Baidu search results with device targeting, language " +
            "filters, time ranges, and pagination.",
        description:
            "Searches Baidu (百度) and returns organic results with title, " +
            "URL, snippet, and position across pages, with " +
            "desktop/mobile/tablet targeting, a language filter, a " +
            "Unix-timestamp date range, and a per-page result count. One " +
            "row per result page.",
        docsUrl: "https://apify.com/johnvc/Baidu-Search-Scraper",
        categories: ["web-search", "seo"],
        notes: [
            "Billing: a one-time setup fee plus one page_processed per page " +
            "in max_pagination, charged when the run starts, so the settled " +
            "page count is the requested cap.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/baidu-search-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~Baidu-Search-Scraper/runs",
    },
    input: {
        schema: {
            body: zBaiduSearchScraperBody.extend({
                // max_pagination is the limiting knob and the actor documents
                // 0 = no limit — floored at 1 with the VERIFIED published
                // default 3 so the estimate is deducible (D25)
                max_pagination: zBaiduSearchScraperBody.shape.max_pagination
                    .unwrap().min(1).default(3),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zBaiduSearchScraperOutput },
    usage: {
        /** The WHOLE published card (design D29): every charge event the
         *  actor publishes is a line, ids normalize from the event names
         *  (D28), amounts are the Business-tier rates. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                setup: {
                    kind: UsageModelKind.PER_CALL,
                    label: "setup fee",
                    // vendor charge event: "setup"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.01 },
                },
                page_processed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "result pages",
                    description: "charged for max_pagination pages up front",
                    // vendor charge event: "page_processed"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.015 },
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
            return {
                counts: {
                    page_processed: body.max_pagination,
                    default_dataset_item: body.max_pagination,
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            // pre-charged from the input cap (money follows the charge)
            const pages = utils.json.optionalNum(body, "$.max_pagination") ??
                rows.length;
            return {
                counts: {
                    page_processed: pages,
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
