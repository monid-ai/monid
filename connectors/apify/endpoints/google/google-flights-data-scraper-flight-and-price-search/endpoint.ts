import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleFlightsDataScraperFlightAndPriceSearchBody } from "./schema/inputs.ts";
import { zGoogleFlightsDataScraperFlightAndPriceSearchOutput } from "./schema/output.ts";

/**
 * johnvc/Google-Flights-Data-Scraper-Flight-and-Price-Search — Search Google Flights.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Flights",
        summary:
            "Search Google Flights for one-way, round-trip, and multi-city " +
            "fares with filters and booking options.",
        description:
            "Searches Google Flights and returns itineraries with prices, " +
            "airlines, durations, stops, layovers, and carbon estimates for " +
            "one-way, round-trip, and multi-city trips. Filters by price, " +
            "stops, airlines, passenger counts, and fare class; optional " +
            "booking options add per-provider prices and booking links. " +
            "Supports many locales and currencies. One row per result page. " +
            "For a synchronous two-airport one-way or round-trip, use " +
            "mrscraper#google/flights; use this endpoint for multi-city " +
            "trips, locale/currency filters, and optional booking-option " +
            "rows (the run is asynchronous).",
        docsUrl:
            "https://apify.com/johnvc/Google-Flights-Data-Scraper-Flight-and-Price-Search",
        categories: ["flights"],
        notes: [
            "Billing: a one-time setup fee plus one page_processed per " +
            "result page; with fetch_booking_options on, each booking " +
            "option retrieved is a booking_option_processed event whose " +
            "count is unknowable before the run.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/google-flights-data-scraper-flight-and-price-search",
    request: {
        method: "POST",
        path:
            "/v2/acts/johnvc~Google-Flights-Data-Scraper-Flight-and-Price-Search/runs",
    },
    input: {
        schema: {
            body: zGoogleFlightsDataScraperFlightAndPriceSearchBody.extend({
                // max_pages is the limiting knob and the actor documents
                // 0 = no limit — floored at 1 with the VERIFIED published
                // default 1 so the estimate is deducible (D25)
                max_pages: zGoogleFlightsDataScraperFlightAndPriceSearchBody
                    .shape.max_pages.unwrap().min(1)
                    .default(1),
                fetch_booking_options:
                    zGoogleFlightsDataScraperFlightAndPriceSearchBody.shape
                        .fetch_booking_options.unwrap().default(false),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zGoogleFlightsDataScraperFlightAndPriceSearchOutput },
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
                setup: {
                    kind: UsageModelKind.PER_CALL,
                    label: "setup fee",
                    // vendor charge event: "setup"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.001 },
                },
                page_processed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "result pages",
                    // vendor charge event: "page_processed"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.015 },
                },
                booking_option_processed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "booking options",
                    description:
                        "per booking option retrieved when fetch_booking_options " +
                        "is on",
                    // vendor charge event: "booking_option_processed"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.02 },
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
                    page_processed: body.max_pages,
                    default_dataset_item: body.max_pages,
                    // promised at the D24 floor 0: the option count is
                    // unknowable pre-run, but the line shows on the hold
                    ...(body.fetch_booking_options
                        ? { booking_option_processed: 0 }
                        : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            const pages = rows.filter((row) =>
                utils.json.optionalGet(row, "$.error") !== true
            ).length;
            const fetching =
                utils.json.optionalGet(body, "$.fetch_booking_options") ===
                    true;
            let options = 0;
            for (const row of rows) {
                options += utils.json.optionalLen(row, "$.booking_options") ??
                    0;
            }
            return {
                counts: {
                    page_processed: pages,
                    default_dataset_item: rows.length,
                    ...(fetching ? { booking_option_processed: options } : {}),
                },
            };
        },
    },
});
