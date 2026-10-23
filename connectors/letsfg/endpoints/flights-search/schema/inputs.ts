import { z } from "zod";

const zIata = z.string().regex(/^[A-Za-z]{2,4}$/);
const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const zClock = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/);

/** POST /flights/search — the vendor mirror
 *  (https://letsfg.co/developers/docs/api-search/, checked 2026-10-23,
 *  bounds from the API's own request model). `provider_filters` is left
 *  out: it is a per-source tuning object for advanced integrations, not a
 *  search parameter. */
export const zFlightSearchBody = z.object({
    origin: zIata.describe(
        "Departure IATA code: an airport (LHR) or a metro area for every " +
            "airport in the city (LON).",
    ),
    destination: zIata.describe(
        "Arrival IATA code: an airport (BCN) or a metro area (NYC).",
    ),
    date_from: zDate.describe(
        "Departure date, YYYY-MM-DD. Must be today or later.",
    ),
    date_to: zDate.describe(
        "End of a departure date window, YYYY-MM-DD.",
    ).optional(),
    return_from: zDate.describe(
        "Return date, YYYY-MM-DD, for a round trip. Omit for one way.",
    ).optional(),
    return_to: zDate.describe(
        "End of a return date window, YYYY-MM-DD.",
    ).optional(),
    adults: z.number().int().min(1).max(9).describe(
        "Adult passengers, 1-9. The API's default is 1.",
    ).optional(),
    children: z.number().int().min(0).max(9).describe(
        "Child passengers (with their own seat), 0-9.",
    ).optional(),
    infants: z.number().int().min(0).max(9).describe(
        "Lap infants, 0-9. At most one per adult; a baby with their own " +
            "seat is a child.",
    ).optional(),
    cabin_class: z.enum(["M", "W", "C", "F"]).describe(
        "Cabin: M economy, W premium economy, C business, F first.",
    ).optional(),
    max_stopovers: z.number().int().min(0).max(4).describe(
        "Most connections per direction, 0-4. The API's default is 2.",
    ).optional(),
    currency: z.string().regex(/^[A-Za-z]{3}$/).describe(
        "Three-letter currency for prices. The API's default is EUR.",
    ).optional(),
    locale: z.string().min(1).describe(
        "Language for city and airport names. The API's default is en.",
    ).optional(),
    limit: z.number().int().min(1).max(200).describe(
        "Most offers to return, 1-200, cheapest first by default.",
    ).optional(),
    sort: z.enum(["price", "duration", "departure_time"]).describe(
        "Sort order. The API's default is price.",
    ).optional(),
    departure_time_from: zClock.describe(
        "Earliest outbound departure, HH:MM (24-hour).",
    ).optional(),
    departure_time_to: zClock.describe(
        "Latest outbound departure, HH:MM (24-hour).",
    ).optional(),
}).strict();
