import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleHotelsSearchScraperBody } from "./schema/inputs.ts";
import { zGoogleHotelsSearchScraperOutput } from "./schema/output.ts";

/**
 * johnvc/google-hotels-search-scraper — Search Google Hotels.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Hotels",
        summary:
            "Scrape Google Hotels search results, property details, photos, " +
            "reviews, and autocomplete suggestions.",
        description:
            "Searches Google Hotels by query or property token and returns " +
            "properties with prices, ratings, amenities, star class, and " +
            "images for a stay, with filters for price, stars, amenities, " +
            "property type, and vacation rentals. Other modes return " +
            "location autocomplete suggestions, a property's photos, or its " +
            "reviews. One row per result page in search mode. " +
            "mrscraper#google/hotel prices one known property URL; use this " +
            "endpoint to search by query, then optionally fetch that " +
            "property's photos or reviews.",
        docsUrl: "https://apify.com/johnvc/google-hotels-search-scraper",
        categories: ["hotels"],
        notes: [
            "search_type selects the billed line: search bills a setup fee " +
            "plus one page_processed per result page; autocomplete, photos, " +
            "and reviews bill per item returned (counts unknowable before " +
            "the run).",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/google-hotels-search-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~google-hotels-search-scraper/runs",
    },
    input: {
        schema: {
            body: zGoogleHotelsSearchScraperBody.extend({
                // the mode switch and the page cap at the actor's VERIFIED
                // published defaults; max_pages documents 0 = no limit and
                // is floored at 1 so the estimate is deducible (D25)
                search_type: zGoogleHotelsSearchScraperBody.shape.search_type
                    .unwrap().default("search"),
                max_pages: zGoogleHotelsSearchScraperBody.shape.max_pages
                    .unwrap().min(1).default(1),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zGoogleHotelsSearchScraperOutput },
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
                    consumes: { credit: "default", amount: 0.00005 },
                },
                setup: {
                    kind: UsageModelKind.PER_CALL,
                    label: "setup fee",
                    // vendor charge event: "setup"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.02 },
                },
                page_processed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search pages",
                    // vendor charge event: "page_processed"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.014 },
                },
                autocomplete_suggestion: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "autocomplete suggestions",
                    description: "search_type autocomplete",
                    // vendor charge event: "autocomplete_suggestion"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.0035 },
                },
                photo_returned: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "photos",
                    description: "search_type photos",
                    // vendor charge event: "photo_returned"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.0007 },
                },
                review_returned: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "reviews",
                    description: "search_type reviews",
                    // vendor charge event: "review_returned"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.0035 },
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
            if (body.search_type === "search") {
                // a property_token details lookup is one page
                const pages = body.property_token ? 1 : body.max_pages;
                return {
                    counts: {
                        page_processed: pages,
                        default_dataset_item: pages,
                    },
                };
            }
            // the per-item modes are promised at the D24 floor 0: their
            // counts are unknowable pre-run, but the line shows on the hold
            if (body.search_type === "autocomplete") {
                return {
                    counts: {
                        autocomplete_suggestion: 0,
                        default_dataset_item: 0,
                    },
                };
            }
            if (body.search_type === "photos") {
                return {
                    counts: { photo_returned: 0, default_dataset_item: 0 },
                };
            }
            return { counts: { review_returned: 0, default_dataset_item: 0 } };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            const mode = utils.json.optionalGet(body, "$.search_type") ??
                "search";
            // error rows and the empty page a zero-result search pushes
            // (properties and ads both empty) are not charged
            // (src/main.py:1660-1695, 2026-09-22)
            const billed = rows.filter((row) =>
                utils.json.optionalGet(row, "$.error") !== true &&
                !(utils.json.optionalLen(row, "$.properties") === 0 &&
                    (utils.json.optionalLen(row, "$.ads") ?? 0) === 0)
            ).length;
            const counts = { default_dataset_item: rows.length };
            if (mode === "autocomplete") {
                return {
                    counts: { ...counts, autocomplete_suggestion: billed },
                };
            }
            if (mode === "photos") {
                return { counts: { ...counts, photo_returned: billed } };
            }
            if (mode === "reviews") {
                return { counts: { ...counts, review_returned: billed } };
            }
            return { counts: { ...counts, page_processed: billed } };
        },
    },
});
