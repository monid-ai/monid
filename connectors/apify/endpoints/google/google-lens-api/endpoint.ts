import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleLensApiBody } from "./schema/inputs.ts";
import { zGoogleLensApiOutput } from "./schema/output.ts";

/**
 * johnvc/google-lens-api — Search Google Lens.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Lens",
        summary:
            "Reverse image search with Google Lens: visual matches, product " +
            "matches with prices, or exact-match pages.",
        description:
            "Runs a Google Lens lookup on an image given by public URL, " +
            "upload, or base64 (up to 10 per run) and returns visual " +
            "matches, product matches with prices and merchants, or the " +
            "pages carrying that exact image, with optional keyword " +
            "narrowing and country/language targeting. One row per match.",
        docsUrl: "https://apify.com/johnvc/google-lens-api",
        categories: ["image-search"],
        notes: [
            "search_type selects the billed line (visual_matches, products, " +
            "or exact_matches); images are read from exactly one of " +
            "image_upload, image_base64, or image_url.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/google-lens-api",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~google-lens-api/runs",
    },
    input: {
        schema: {
            body: zGoogleLensApiBody.extend({
                // the mode switch and the limiting knob at the actor's
                // VERIFIED published defaults (D25)
                search_type: zGoogleLensApiBody.shape.search_type.unwrap()
                    .default("visual_matches"),
                max_results: zGoogleLensApiBody.shape.max_results.unwrap()
                    .default(50),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zGoogleLensApiOutput },
    usage: {
        /** The WHOLE published card (design D29): every charge event the
         *  actor publishes is a line, ids normalize from the event names
         *  (D28), amounts are the Business-tier rates. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                visual_match_returned: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "visual matches",
                    description: "search_type visual_matches",
                    // vendor charge event: "visual_match_returned"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.0002 },
                },
                product_match_returned: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "product matches",
                    description: "search_type products",
                    // vendor charge event: "product_match_returned"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00065 },
                },
                exact_match_returned: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "exact matches",
                    description: "search_type exact_matches",
                    // vendor charge event: "exact_match_returned"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00025 },
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
            // one image door: uploads, else base64 entries, else the URL
            const images = (body.image_upload?.length ?? 0) ||
                (body.image_base64?.length ?? 0) ||
                (body.image_url ? 1 : 0);
            const matches = body.max_results * images;
            const counts = { default_dataset_item: matches };
            if (body.search_type === "products") {
                return {
                    counts: { ...counts, product_match_returned: matches },
                };
            }
            if (body.search_type === "exact_matches") {
                return { counts: { ...counts, exact_match_returned: matches } };
            }
            return { counts: { ...counts, visual_match_returned: matches } };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            const mode = utils.json.optionalGet(body, "$.search_type") ??
                "visual_matches";
            const billed = rows.filter((row) =>
                utils.json.optionalGet(row, "$.resultType") !== "error"
            ).length;
            const counts = { default_dataset_item: rows.length };
            if (mode === "products") {
                return {
                    counts: { ...counts, product_match_returned: billed },
                };
            }
            if (mode === "exact_matches") {
                return { counts: { ...counts, exact_match_returned: billed } };
            }
            return { counts: { ...counts, visual_match_returned: billed } };
        },
    },
});
