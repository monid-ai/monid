import { z } from "zod";

/** GET /flights/locations/{query} — the vendor mirror
 *  (https://letsfg.co/developers/docs/api-search/, checked 2026-10-23). */
export const zLocationsPathParams = z.object({
    query: z.string().min(1).describe(
        "A city, airport or metro-area name, or a partial one (London, " +
            "Heathrow, New York).",
    ),
}).strict();
