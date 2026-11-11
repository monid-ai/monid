import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleEventsApiAccessGoogleEventsDataBody } from "./schema/inputs.ts";
import { zGoogleEventsApiAccessGoogleEventsDataOutput } from "./schema/output.ts";

/**
 * johnvc/google-events-api---access-google-events-data — Search Google Events.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Events",
        summary:
            "Scrape Google Events search results with dates, venues, ticket " +
            "links, and locations.",
        description:
            "Searches Google Events for concerts, conferences, festivals, " +
            "sports, theater, and virtual events by query, with location " +
            "bias, country and language targeting, and date filters (today, " +
            "tomorrow, this week, and more). Each result page row carries " +
            "its events with title, date, venue, address, description, and " +
            "ticket links.",
        docsUrl:
            "https://apify.com/johnvc/google-events-api---access-google-events-data",
        categories: ["events"],
        notes: [
            "Billing: a one-time setup fee, one page_processed for the " +
            "single result page, and one event_returned per event on it " +
            "(about 10; the count is unknowable before the run).",
            "max_pages is retained for backward compatibility only: the " +
            "actor always fetches exactly one page (src/main.py:323-328).",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/google-events-api---access-google-events-data",
    request: {
        method: "POST",
        path:
            "/v2/acts/johnvc~google-events-api---access-google-events-data/runs",
    },
    input: {
        schema: {
            body: zGoogleEventsApiAccessGoogleEventsDataBody,
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zGoogleEventsApiAccessGoogleEventsDataOutput },
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
                    consumes: { credit: "default", amount: 0.0125 },
                },
                page_processed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "result pages",
                    // vendor charge event: "page_processed"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00001 },
                },
                event_returned: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "events",
                    // vendor charge event: "event_returned"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00132 },
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
        estimate: () => {
            return {
                counts: {
                    // the actor fetches exactly one page per run
                    page_processed: 1,
                    // promised at the D24 floor 0: events per page are
                    // unknowable pre-run, but the line shows on the hold
                    event_returned: 0,
                    default_dataset_item: 1,
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const pages = rows.filter((row) =>
                utils.json.optionalGet(row, "$.error") !== true
            ).length;
            let events = 0;
            for (const row of rows) {
                events += utils.json.optionalLen(row, "$.events") ?? 0;
            }
            return {
                counts: {
                    page_processed: pages,
                    event_returned: events,
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
