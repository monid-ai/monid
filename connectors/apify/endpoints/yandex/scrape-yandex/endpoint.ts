import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zScrapeYandexBody } from "./schema/inputs.ts";
import { zScrapeYandexOutput } from "./schema/output.ts";

/**
 * johnvc/Scrape-Yandex — Search Yandex.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Yandex",
        summary:
            "Scrape Yandex search results: organic listings, ads, knowledge " +
            "graph, and inline images and videos.",
        description:
            "Searches Yandex for a query and returns result pages with " +
            "organic listings, and optionally ads, the knowledge graph " +
            "card, inline image and video strips, and the dedicated Images " +
            "and Videos verticals, across six regional domains with " +
            "language, region, safe-search, recency, and sort controls. One " +
            "row per result group per page. Yandex SERP pages, not " +
            "reverse-image; for a Yandex image lookup use " +
            "apify#johnvc/yandex-reverse-image-search.",
        docsUrl: "https://apify.com/johnvc/Scrape-Yandex",
        categories: ["web-search", "seo"],
        notes: [
            "Billing: a one-time setup fee plus one page_processed per " +
            "result page; each vertical switched on (include_image_search, " +
            "include_video_search) fetches up to max_pages of its own. The " +
            "actor caps a run at 50 pages per search.",
            "A run that delivers no page is not charged the setup fee by " +
            "the actor; the declared card still bills it, a $0.05 residual " +
            "on empty searches.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/scrape-yandex",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~Scrape-Yandex/runs",
    },
    input: {
        schema: {
            body: zScrapeYandexBody.extend({
                // max_pages is the limiting knob and the actor documents
                // 0 = no limit — floored at 1 with the VERIFIED published
                // default 2 so the estimate is deducible (D25); the
                // vertical switches at their published default false
                max_pages: zScrapeYandexBody.shape.max_pages.unwrap().min(1)
                    .default(2),
                include_image_search: zScrapeYandexBody.shape
                    .include_image_search
                    .unwrap().default(false),
                include_video_search: zScrapeYandexBody.shape
                    .include_video_search
                    .unwrap().default(false),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zScrapeYandexOutput },
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
                    consumes: { credit: "default", amount: 0.05 },
                },
                page_processed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "result pages",
                    description:
                        "one per web result page, and per Images/Videos vertical " +
                        "page when switched on",
                    // vendor charge event: "page_processed"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.024 },
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
            // the actor hard-caps a search at 50 pages (YandexReader.py:110)
            const perSearch = Math.min(body.max_pages, 50);
            const searches = 1 + (body.include_image_search ? 1 : 0) +
                (body.include_video_search ? 1 : 0);
            const pages = perSearch * searches;
            return {
                counts: { page_processed: pages, default_dataset_item: pages },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            // rows are result groups stamped with page_number (>= 1) and an
            // item_type; the Images/Videos verticals number their own pages,
            // so a page is (vertical, page_number). Error and zero-result
            // summary rows carry page_number 0 and are uncharged
            // (src/main.py:476-488, :697, :804, :840-850, 2026-09-22)
            const keys = rows
                .map((row) => {
                    const page = utils.json.optionalNum(row, "$.page_number") ??
                        0;
                    const type = utils.json.optionalStr(row, "$.item_type") ??
                        "";
                    const vertical =
                        type === "image_search" || type === "video_search"
                            ? type
                            : "web";
                    return page >= 1 ? vertical + ":" + page : "";
                })
                .filter((key) => key !== "");
            const distinct = keys.filter((key, i) => keys.indexOf(key) === i);
            const delivered = rows.filter((row) =>
                utils.json.optionalGet(row, "$.error") !== true
            ).length;
            // chain rows carry no page_number: anything delivered is one page
            const pages = distinct.length > 0
                ? distinct.length
                : (delivered > 0 ? 1 : 0);
            return {
                counts: {
                    page_processed: pages,
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
