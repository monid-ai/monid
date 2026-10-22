import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleImagesApiBody } from "./schema/inputs.ts";
import { zGoogleImagesApiOutput } from "./schema/output.ts";

/**
 * johnvc/google-images-api — Search Google Images.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Images",
        summary: "Bulk Google Images search returning image URL, size, " +
            "thumbnail, source page, and domain per result.",
        description:
            "Searches Google Images for one or more queries and returns " +
            "each image's URL, width and height, thumbnail, source site and " +
            "page link, with country and language targeting. Built for SEO " +
            "research, dataset assembly, and agents. One row per image.",
        docsUrl: "https://apify.com/johnvc/google-images-api",
        categories: ["image-search", "web-search"],
        notes: [
            "Billing is per image returned; the actor never returns fewer " +
            "than 50 images per query, so a maxResultsPerQuery below 50 is " +
            "raised to 50.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/google-images-api",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~google-images-api/runs",
    },
    input: {
        schema: {
            body: zGoogleImagesApiBody.extend({
                // the limiting knob, at the actor's VERIFIED published
                // default (100) so the estimate is deducible (D25)
                maxResultsPerQuery: zGoogleImagesApiBody.shape
                    .maxResultsPerQuery
                    .unwrap().default(100),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zGoogleImagesApiOutput },
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
                image_scraped: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "images",
                    // vendor charge event: "image_scraped"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.0001 },
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
            // the actor raises any per-query cap below 50 to 50
            // (src/main.py:86-96, 2026-09-22)
            const perQuery = Math.max(50, body.maxResultsPerQuery);
            const images = perQuery * body.queries.length;
            return {
                counts: { image_scraped: images, default_dataset_item: images },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const images = rows.filter((row) =>
                utils.json.optionalGet(row, "$.error_message") === undefined
            ).length;
            return {
                counts: {
                    image_scraped: images,
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
