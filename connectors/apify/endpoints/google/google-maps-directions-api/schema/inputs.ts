import { z } from "zod";

/**
 * johnvc/google-maps-directions-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~google-maps-directions-api/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zGoogleMapsDirectionsApiBody = z.object({
    start_addr: z.string().describe(
        "Enter the starting address or place name (e.g. 'New York, NY' or 'Empire State Building'). Provide this or `start_coords` or `start_data_id` for the origin.",
    ).optional(),
    end_addr: z.string().describe(
        "Enter the destination address or place name (e.g. 'Boston, MA' or 'Fenway Park'). Provide this or `end_coords` or `end_data_id` for the destination.",
    ).optional(),
    start_coords: z.string().describe(
        "Optionally set the origin as exact GPS coordinates in 'latitude,longitude' format (e.g. '40.7128,-74.0060'). Overrides the start address when provided.",
    ).optional(),
    end_coords: z.string().describe(
        "Optionally set the destination as exact GPS coordinates in 'latitude,longitude' format (e.g. '42.3601,-71.0589'). Overrides the end address when provided.",
    ).optional(),
    start_data_id: z.string().describe(
        "Optionally set the origin as a Google Maps place data ID (e.g. '0x89c24fa5d33f083b:0xc80b8f06e177fe62'). Overrides the start address when provided.",
    ).optional(),
    end_data_id: z.string().describe(
        "Optionally set the destination as a Google Maps place data ID. Overrides the end address when provided.",
    ).optional(),
    travel_mode: z.enum([
        "best",
        "driving",
        "cycling",
        "walking",
        "transit",
        "flight",
        "two-wheeler",
    ]).describe(
        "Choose how to travel. 'Best' returns the best options across modes; the others restrict the result to one mode. Flight and two-wheeler are only available for some regions and routes.",
    ).optional(),
    distance_unit: z.enum(["auto", "km", "miles"]).describe(
        "Choose the distance unit for the results. 'Automatic' lets the region decide.",
    ).optional(),
    avoid_tolls: z.boolean().describe(
        "Enable to prefer routes without toll roads. Applied as a preference; Google may still include tolls if no alternative exists.",
    ).optional(),
    avoid_highways: z.boolean().describe(
        "Enable to prefer routes that avoid highways.",
    ).optional(),
    avoid_ferries: z.boolean().describe(
        "Enable to prefer routes that avoid ferries.",
    ).optional(),
    transit_prefer: z.enum([
        "none",
        "bus",
        "subway",
        "train",
        "tram",
        "light_rail",
    ]).describe(
        "Set a preferred public transit mode. Only applied when Travel Mode is 'Transit'. Leave as 'None' for no preference.",
    ).optional(),
    transit_routing: z.enum([
        "none",
        "fewer_transfers",
        "less_walking",
        "wheelchair",
    ]).describe(
        "Set how transit routes are optimized. Only applied when Travel Mode is 'Transit'. Leave as 'None' for the default.",
    ).optional(),
    time_type: z.enum(["leave_now", "depart_at", "arrive_by"]).describe(
        "Choose whether the time below is a departure time, an arrival time, or to leave now. 'Leave now' ignores the time value.",
    ).optional(),
    time_value: z.string().describe(
        "Set the departure or arrival time as an ISO 8601 datetime (e.g. '2026-06-01T09:00:00') or a Unix timestamp. Used only when Time Mode is 'Depart at' or 'Arrive by'.",
    ).optional(),
    hl: z.string().describe(
        "Set the two-letter interface language code (ISO 639-1, e.g. 'en', 'es', 'fr'). Controls the language of instructions and place names. Defaults to 'en'.",
    ).optional(),
    gl: z.string().describe(
        "Set the two-letter country code (ISO 3166-1, e.g. 'us', 'gb', 'ca'). Influences regional routing and defaults. Defaults to 'us'.",
    ).optional(),
});
