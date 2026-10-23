import { z } from "zod";

const zIata = z.string().regex(/^[A-Za-z]{3}$/);
const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** POST /flights/discover — the vendor mirror
 *  (https://letsfg.co/developers/docs/api-search/, checked 2026-10-23).
 *  The API also takes same-day round-trip options; they are not part of
 *  the documented contract and are left out. */
export const zDiscoverBody = z.object({
    origin: zIata.describe("Departure IATA code (JFK, LON)."),
    destinations: z.array(zIata).min(1).max(20).describe(
        "1-20 destination IATA codes to price from the origin.",
    ),
    date_from: zDate.describe(
        "Departure date, YYYY-MM-DD. Must be today or later.",
    ),
    return_from: zDate.describe(
        "Return date, YYYY-MM-DD, to price round trips. Omit for one way.",
    ).optional(),
    currency: z.string().regex(/^[A-Za-z]{3}$/).describe(
        "Three-letter currency for prices. The API's default is EUR.",
    ).optional(),
}).strict();
