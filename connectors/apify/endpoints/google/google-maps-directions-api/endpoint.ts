import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleMapsDirectionsApiBody } from "./schema/inputs.ts";
import { zGoogleMapsDirectionsApiOutput } from "./schema/output.ts";

/**
 * johnvc/google-maps-directions-api — Get Google Maps Directions.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Google Maps Directions",
        summary:
            "Google Maps directions for driving, transit, walking, cycling, " +
            "or flights with distance, ETA, and steps.",
        description: "Gets Google Maps directions between an origin and a " +
            "destination given as addresses, coordinates, or place data " +
            "IDs, for the best route or a chosen travel mode, with " +
            "toll/highway/ferry avoidance, transit preferences, and a " +
            "departure or arrival time. Returns routes with distance, " +
            "duration, and turn-by-turn steps. One row per run. This is " +
            "turn-by-turn directions, not place search; for business " +
            "listings use apify#damilo/google-maps-scraper.",
        docsUrl: "https://apify.com/johnvc/google-maps-directions-api",
        categories: ["maps"],
        notes: [
            "Billing: a one-time setup fee plus one directions_processed " +
            "event per run (one origin/destination pair per run, charged " +
            "even when Google returns no route).",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/google-maps-directions-api",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~google-maps-directions-api/runs",
    },
    input: {
        schema: {
            body: zGoogleMapsDirectionsApiBody,
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zGoogleMapsDirectionsApiOutput },
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
                    consumes: { credit: "default", amount: 0.01 },
                },
                directions_processed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "routes",
                    // vendor charge event: "directions_processed"
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
        estimate: () => ({
            counts: { directions_processed: 1, default_dataset_item: 1 },
        }),
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            return {
                counts: {
                    directions_processed: rows.length,
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
