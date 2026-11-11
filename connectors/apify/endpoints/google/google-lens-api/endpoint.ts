import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
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
            "search_type selects the billed line (visual_matches or " +
            "exact_matches); images are read from exactly one of " +
            "image_upload, image_base64, or image_url.",
            "Every billed lookup pays a per-image minimum (50 visual matches, " +
            "40 exact matches), an empty lookup included; a lookup the " +
            "vendor fails bills nothing (actor 1.1.0, 2026-10-07).",
            "The products search type is retired: Google discontinued the " +
            "Lens Products view in October 2026 (actor 1.1.1), so it is " +
            "rejected at the binding.",
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
                // the mode switch, NARROWED at the binding: `products` is
                // retired upstream (Google discontinued the Lens Products
                // view, October 2026 — the actor's own event text, 1.1.1)
                // and would only return an error row; the limiting knob at
                // the actor's VERIFIED published default (D25)
                search_type: z.enum(["visual_matches", "exact_matches"])
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
        /** Per-image minimum (actor 1.1.0): every billed lookup pays at
         *  least 50 visual / 40 exact results, so a request below the floor
         *  is estimated at the floor. */
        estimate: ({ data }) => {
            const body = data.input.body;
            // one image door: uploads, else base64 entries, else the URL
            const images = (body.image_upload?.length ?? 0) ||
                (body.image_base64?.length ?? 0) ||
                (body.image_url ? 1 : 0);
            const exact = body.search_type === "exact_matches";
            const floor = exact ? 40 : 50;
            const billed = Math.max(body.max_results, floor) * images;
            const rows = body.max_results * images;
            return {
                counts: exact
                    ? {
                        exact_match_returned: billed,
                        default_dataset_item: rows,
                    }
                    : {
                        visual_match_returned: billed,
                        default_dataset_item: rows,
                    },
            };
        },
        /** OVERRIDES the provider evidence: per image, max(rows, floor) —
         *  the actor tops an under-floor or empty lookup up to the minimum
         *  (src/main.py:329-346), while a failed lookup (its error row)
         *  bills nothing. Images seen in rows are grouped by queryImage;
         *  images with no row at all are empty lookups at the floor unless
         *  an error row accounts for them. */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            const exact = utils.json.optionalGet(body, "$.search_type") ===
                "exact_matches";
            const floor = exact ? 40 : 50;
            const matches = rows.filter((row) =>
                utils.json.optionalGet(row, "$.resultType") !== "error"
            );
            const errors = rows.length - matches.length;
            const images = matches.map((row) =>
                utils.json.optionalStr(row, "$.queryImage") ?? ""
            );
            const seen = images.filter((image, i) =>
                images.indexOf(image) === i
            );
            let billed = 0;
            for (const image of seen) {
                const delivered = images.filter((x) => x === image).length;
                billed += Math.max(delivered, floor);
            }
            const requested = (utils.json.optionalLen(body, "$.image_upload") ??
                0) ||
                (utils.json.optionalLen(body, "$.image_base64") ?? 0) ||
                (utils.json.optionalStr(body, "$.image_url") !== undefined
                    ? 1
                    : 0);
            const unseen = Math.max(0, requested - seen.length - errors);
            billed += unseen * floor;
            return {
                counts: exact
                    ? {
                        exact_match_returned: billed,
                        default_dataset_item: rows.length,
                    }
                    : {
                        visual_match_returned: billed,
                        default_dataset_item: rows.length,
                    },
            };
        },
    },
});
