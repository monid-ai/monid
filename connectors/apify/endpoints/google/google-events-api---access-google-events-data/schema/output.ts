import { z } from "zod";

/**
 * johnvc/google-events-api---access-google-events-data — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zGoogleEventsApiAccessGoogleEventsDataOutputItem = z.object({
    search_parameters: z.object({
        q: z.string().describe("The search query sent to Google Events.")
            .optional(),
        location: z.string().describe(
            "Geographic location used to bias results.",
        ).optional(),
        gl: z.string().describe("ISO 3166-1 alpha-2 country code (lowercase).")
            .optional(),
        hl: z.string().describe("ISO 639-1 language code (lowercase).")
            .optional(),
        start: z.number().int().describe(
            "Echo of the start input. Has no effect on event listings.",
        ).optional(),
        advanced: z.string().describe(
            "Echo of the input filter string. Date tokens are applied by rewriting the search query; the first date token passed takes effect.",
        ).optional(),
        max_pages: z.number().int().describe(
            "Echo of the max_pages input. Values above 1 are clamped, since events render on one page.",
        ).optional(),
        applied_hit_chips: z.array(z.string()).describe(
            "Hit-chip tokens that were applied to this search.",
        ).optional(),
    }).describe("Echo of the input parameters used for this page's search.")
        .optional(),
    search_metadata: z.object({
        total_results: z.number().int().describe(
            "Number of events returned. Google no longer publishes a total count for this listing type.",
        ).optional(),
        events_count: z.number().int().describe(
            "Number of events returned across all processed pages.",
        ).optional(),
        hit_chips_count: z.number().int().describe(
            "Number of hit-chip filter options surfaced by Google Events.",
        ).optional(),
        filters_count: z.number().int().describe(
            "Number of secondary filter groups surfaced by Google Events.",
        ).optional(),
        pages_processed: z.number().int().describe(
            "How many pages were fetched. Always 0 or 1: event listings render on one page only.",
        ).optional(),
        max_pages_set: z.number().int().describe(
            "max_pages value from input (after normalization).",
        ).optional(),
        pagination_limit_reached: z.boolean().describe(
            "Always false. Retained for backward compatibility; there is no second page to stop at.",
        ).optional(),
    }).describe("Summary statistics for the run.").optional(),
    search_timestamp: z.string().describe(
        "ISO 8601 timestamp when this page was fetched.",
    ).optional(),
    page_number: z.number().int().describe(
        "1-indexed page number of the result page in this dataset item.",
    ).optional(),
    events: z.array(z.object({
        title: z.string().describe("Display title of the event.").optional(),
        type: z.string().describe(
            "Short category or venue label shown on the listing (e.g. 'Live music', 'Festival').",
        ).optional(),
        date: z.object({
            start_date: z.string().describe(
                "Short start date label (e.g. 'Aug 14').",
            ).optional(),
            when: z.string().describe(
                "Start date combined with start time (e.g. 'Aug 14, 2:30 PM'). Google no longer publishes a full start-to-end range for these listings.",
            ).optional(),
        }).describe("Date information for the event.").optional(),
        time: z.string().describe(
            "Start time as shown on the listing (e.g. '2:30 PM'). Absent on all-day or multi-day listings.",
        ).optional(),
        when: z.string().describe(
            "Start date combined with start time (flat duplicate of date.when for table views and spreadsheet exports).",
        ).optional(),
        address: z.array(z.string()).describe(
            "Address lines for the event location, typically venue name followed by neighborhood.",
        ).optional(),
        venue_name: z.string().describe("First address line, the venue name.")
            .optional(),
        area: z.string().describe(
            "Second address line, usually the neighborhood or city.",
        ).optional(),
        link: z.string().describe(
            "Link to the event listing. Only present on the minority of listings sourced from a single venue's calendar; most listings carry no link.",
        ).optional(),
        source: z.string().describe(
            "Name of the site the listing came from. Present only alongside 'link'.",
        ).optional(),
        description: z.string().describe(
            "Always an empty string. Retained so consumers written against earlier versions keep working; Google stopped publishing descriptions for these listings when it retired the events vertical.",
        ).optional(),
        venue: z.object({}).describe(
            "Always an empty object. Retained for backward compatibility; venue ratings and review counts are no longer published for these listings. The venue name is the first entry of 'address'.",
        ).optional(),
    })).describe(
        "Event listings on this page. Each item contains title, event type, date, time and address. Events are returned as a single batch of up to 10; there is no second page.",
    ).optional(),
    hit_chips: z.array(z.record(z.string(), z.any())).describe(
        "Always empty. Filter chips were an affordance of the retired events vertical and are no longer returned. Retained so the row shape is unchanged.",
    ).optional(),
    filters: z.array(z.object({
        key: z.string().describe("Filter group identifier.").optional(),
        values: z.array(z.record(z.string(), z.any())).describe(
            "List of available values for this filter group.",
        ).optional(),
    })).describe(
        "Always empty. Secondary filter groups were an affordance of the retired events vertical and are no longer returned. Retained so the row shape is unchanged.",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zGoogleEventsApiAccessGoogleEventsDataOutput = z.array(
    zGoogleEventsApiAccessGoogleEventsDataOutputItem.or(
        z.record(z.string(), z.unknown()),
    ),
);
