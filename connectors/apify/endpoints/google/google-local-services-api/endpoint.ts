import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleLocalServicesApiBody } from "./schema/inputs.ts";
import { zGoogleLocalServicesApiOutput } from "./schema/output.ts";

/**
 * johnvc/google-local-services-api — Search Google Local Services Ads.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Local Services Ads",
        summary:
            "Google Guaranteed and Google Screened home-service pros with " +
            "ratings, reviews, and phone numbers.",
        description:
            "Searches Google Local Services Ads for a service in a US city " +
            "or district and returns the advertising businesses: name, " +
            "Google Guaranteed/Screened badge, rating and review count, " +
            "phone number, years in business, and service areas, for one or " +
            "many queries with an optional job type. One row per business. " +
            "For organic local-pack listings use litescrape#google/local or " +
            "apify#damilo/google-maps-scraper; this endpoint returns Google " +
            "Local Services Ads (Guaranteed/Screened pros), not Maps " +
            "places.",
        docsUrl: "https://apify.com/johnvc/google-local-services-api",
        categories: ["maps"],
        notes: [
            "Billing: one location_resolved event per run (skipped when " +
            "dataCid is supplied) plus one business_returned event per " +
            "business.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/google-local-services-api",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~google-local-services-api/runs",
    },
    input: {
        schema: {
            body: zGoogleLocalServicesApiBody.required({
                // the limiting knob; the actor publishes no default, so WE
                // require it — the estimate is deduced or the run never
                // starts (D24)
                maxResultsPerQuery: true,
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zGoogleLocalServicesApiOutput },
    usage: {
        /** The WHOLE published card (design D29): every charge event the
         *  actor publishes is a line, ids normalize from the event names
         *  (D28), amounts are the Business-tier rates. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                business_returned: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "businesses",
                    // vendor charge event: "business_returned"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.0037 },
                },
                location_resolved: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "location lookups",
                    description: "one per run unless dataCid is given",
                    // vendor charge event: "location_resolved"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.015 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const queries = (body.query ? 1 : 0) + (body.queries?.length ?? 0);
            return {
                counts: {
                    business_returned: body.maxResultsPerQuery * queries,
                    location_resolved: body.dataCid ? 0 : 1,
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            // error rows and the no_results marker row are pushed uncharged
            // (src/main.py:107-117, :242-250, 2026-09-22)
            const served = rows.filter((row) =>
                utils.json.optionalGet(row, "$.result_type") !== "error"
            );
            const businesses = served.filter((row) =>
                utils.json.optionalGet(row, "$.result_type") !== "no_results"
            ).length;
            // the location lookup bills once per run when a location (not a
            // dataCid) was resolved and the search went ahead
            const resolved =
                utils.json.optionalGet(body, "$.dataCid") === undefined &&
                    served.length > 0
                    ? 1
                    : 0;
            return {
                counts: {
                    business_returned: businesses,
                    location_resolved: resolved,
                },
            };
        },
    },
});
