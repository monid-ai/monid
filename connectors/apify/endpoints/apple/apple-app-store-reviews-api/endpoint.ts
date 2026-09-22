import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppleAppStoreReviewsApiBody } from "./schema/inputs.ts";
import { zAppleAppStoreReviewsApiOutput } from "./schema/output.ts";

/**
 * johnvc/apple-app-store-reviews-api — List App Store Reviews.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "List App Store Reviews",
        summary: "Fetch iOS and macOS App Store reviews by product ID or app " +
            "name across 50+ country stores.",
        description:
            "Fetches Apple App Store reviews for one or more apps (by " +
            "numeric product ID or a free-form app name) in a chosen " +
            "country store: rating, title, text, date, app version, author, " +
            "and helpfulness votes, sorted by recency, helpfulness, or " +
            "rating polarity. One row per review. For a synchronous " +
            "single-page fetch billed as one Litescrape credit, use " +
            "litescrape#apple/app-store/reviews; use this endpoint for " +
            "multi-app, multi-country pulls billed per review.",
        docsUrl: "https://apify.com/johnvc/apple-app-store-reviews-api",
        categories: ["app-stores", "company-reviews"],
        notes: [
            "Billing: a one-time setup fee plus one review event per review " +
            "returned. The actor-start platform event is priced per GB and " +
            "this actor runs at 4 GB by default, so the settled start " +
            "charge can be a few hundredths of a cent above the pinned rate " +
            "(drift pins the published rate).",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/apple-app-store-reviews-api",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~apple-app-store-reviews-api/runs",
    },
    // the actor's own published default run timeout exceeds the
    // provider's 300 s budget (defaultRunOptions.timeoutSecs, 2026-09-22)
    timeouts: { runMs: 3_600_000 },
    input: {
        schema: {
            body: zAppleAppStoreReviewsApiBody.extend({
                // max_reviews is the limiting knob and the actor documents
                // 0 = unlimited — floored at 1 with the VERIFIED published
                // default 100 so the estimate is deducible (D25)
                max_reviews: zAppleAppStoreReviewsApiBody.shape.max_reviews
                    .unwrap().min(1).default(100),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zAppleAppStoreReviewsApiOutput },
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
                    consumes: { credit: "default", amount: 0.0175 },
                },
                review: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "reviews",
                    // vendor charge event: "review"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.0015 },
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
            // product_ids is the multiplier; app_name resolves to ONE app
            const apps = (body.product_ids?.length ?? 0) ||
                (body.app_name ? 1 : 0);
            const reviews = body.max_reviews * apps;
            return {
                counts: { review: reviews, default_dataset_item: reviews },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const reviews = rows.filter((row) =>
                utils.json.optionalGet(row, "$.error") === undefined
            ).length;
            return {
                counts: { review: reviews, default_dataset_item: rows.length },
            };
        },
    },
});
