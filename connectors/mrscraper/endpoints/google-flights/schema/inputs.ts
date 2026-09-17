import { z } from "zod";
import { zSearchCountry } from "../../../schema/common.ts";

/** POST /api/google-flight/cbc/sync body — the vendor mirror (the
 *  marketplace card via v1, 2026-09-17). A round trip needs a return date:
 *  the vendor's own rule, bound as a union in endpoint.ts. */

const zIataCode = z.string().regex(/^[A-Za-z]{3}$/);
// z.iso.date() compiles to a calendar-aware pattern (month/day bounds, leap
// years) — real validation survives into the compiled doc, unlike a .refine.
const zIsoDate = z.iso.date();

export const zGoogleFlightsSearchBody = z.object({
    origin: zIataCode.describe("Origin airport IATA code, e.g. 'JFK'."),
    destination: zIataCode.describe(
        "Destination airport IATA code, e.g. 'SIN'.",
    ),
    type: z.enum(["OW", "RT"]).describe(
        "Trip type: 'OW' one-way or 'RT' round-trip.",
    ),
    date: zIsoDate.describe("Departure date in YYYY-MM-DD format."),
    returnDate: zIsoDate.describe(
        "Return date in YYYY-MM-DD format; required for round-trip searches.",
    ).optional(),
    country: zSearchCountry.describe(
        "Two-letter Google region code for the edition, e.g. 'us'.",
    ),
}).strict();
