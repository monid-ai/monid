import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYandexReverseImageSearchBody } from "./schema/inputs.ts";
import { zYandexReverseImageSearchOutput } from "./schema/output.ts";

/**
 * johnvc/yandex-reverse-image-search — Yandex Reverse Image Search.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Yandex Reverse Image Search",
        summary:
            "Search Yandex by image URL: matching pages, similar images, " +
            "other sizes, shopping matches, and tags.",
        description:
            "Runs a Yandex reverse image search for a public image URL and " +
            "returns the pages where the image appears, visually similar " +
            "images, other resolutions of the same image, matching shop " +
            "products with prices, suggested tags, and the entity card when " +
            "the subject is recognizable, with an optional crop box and six " +
            "regional domains. One row per result.",
        docsUrl: "https://apify.com/johnvc/yandex-reverse-image-search",
        categories: ["image-search"],
        notes: [
            "Billing is per result in blocks of 10: result_returned is " +
            "charged for each started block of 10 rows, so a run delivering " +
            "23 rows bills 30.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/yandex-reverse-image-search",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~yandex-reverse-image-search/runs",
    },
    input: {
        schema: {
            body: zYandexReverseImageSearchBody.extend({
                // the limiting knob at the actor's VERIFIED published
                // default (50; published floor 10) so the estimate is
                // deducible (D25)
                max_results: zYandexReverseImageSearchBody.shape.max_results
                    .unwrap().default(50),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zYandexReverseImageSearchOutput },
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
                result_returned: {
                    // D4: the actor rounds the EVENT COUNT up to a multiple of 10
                    // (23 rows → 30 events at $0.01 each), so the quantity fns round;
                    // `every: 10` is the wrong construct here — it would collapse 10
                    // events per block into ONE $0.01 charge per block.
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "results (blocks of 10)",
                    description: "charged per started block of 10 rows",
                    // vendor charge event: "result_returned"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.01 },
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
                    result_returned: Math.ceil(body.max_results / 10) * 10,
                    default_dataset_item: body.max_results,
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            // error rows carry result_type "error" and are uncharged; the
            // no_results summary row is NOT an error and bills one block
            // (src/main.py:297, :368, :459-483, 2026-09-22)
            const billed = rows.filter((row) =>
                utils.json.optionalGet(row, "$.result_type") !== "error"
            ).length;
            return {
                counts: {
                    result_returned: Math.ceil(billed / 10) * 10,
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
