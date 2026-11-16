import { z } from "zod";

/**
 * johnvc/google-maps-directions-api — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zGoogleMapsDirectionsApiOutputItem = z.object({
    result_type: z.string().describe(
        "Either 'directions' (a resolved route row) or 'error' (a validation or lookup error row).",
    ).optional(),
    start: z.string().describe(
        "The origin used for the lookup (the address, coordinates, or place ID provided).",
    ).optional(),
    end: z.string().describe(
        "The destination used for the lookup (the address, coordinates, or place ID provided).",
    ).optional(),
    travel_mode: z.string().describe(
        "The requested travel mode: best, driving, cycling, walking, transit, flight, or two-wheeler.",
    ).optional(),
    directions_found: z.boolean().describe(
        "True if at least one route option was returned, false if none was available for this origin and destination.",
    ).optional(),
    directions_count: z.number().int().describe(
        "Number of route options returned in the directions array.",
    ).optional(),
    best_duration: z.string().describe(
        "Human-readable travel time of the first (recommended) route option, e.g. '3 hr 38 min'.",
    ).optional(),
    best_distance: z.string().describe(
        "Human-readable distance of the first (recommended) route option, e.g. '215 miles'.",
    ).optional(),
    places_info: z.array(z.record(z.string(), z.any())).describe(
        "Resolved origin and destination details: formatted address, place ID, and GPS coordinates.",
    ).optional(),
    directions: z.array(z.record(z.string(), z.any())).describe(
        "Route options for the request. Each option carries travel mode, distance, duration, formatted distance/duration, route summary (via), notes (extensions), and trips with turn-by-turn steps. Transit options include stops, lines, operators, and times.",
    ).optional(),
    durations: z.array(z.record(z.string(), z.any())).describe(
        "Summary of travel time by mode (driving, transit, walking, cycling, flight) for this origin and destination.",
    ).optional(),
    google_maps_directions_url: z.string().describe(
        "Direct Google Maps link that opens the same directions in a browser.",
    ).optional(),
    gl: z.string().describe("Country code used for the lookup.").optional(),
    hl: z.string().describe("Interface language code used for the lookup.")
        .optional(),
    fetched_at: z.string().describe(
        "ISO 8601 timestamp of when this row was produced.",
    ).optional(),
    note: z.string().describe(
        "Human-readable note explaining why no route was returned, when applicable.",
    ).optional(),
    error_message: z.string().describe(
        "Human-readable error description. Only present on rows with result_type='error'.",
    ).optional(),
    error_type: z.string().describe(
        "Machine-readable error category (e.g. 'MissingRequiredParameter', 'MissingApiKey', 'DirectionsError').",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zGoogleMapsDirectionsApiOutput = z.array(
    zGoogleMapsDirectionsApiOutputItem.or(z.record(z.string(), z.unknown())),
);
