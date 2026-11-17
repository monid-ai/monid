import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `booking/listings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/booking/listings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zBookingListingsBody = z.object({
    location: z.string()
        .describe(
            'By Search: a destination or search keyword (city, region, landmark, or area), e.g. "Paris" or "Bali villas".',
        )
        .optional(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Check-in date (YYYY-MM-DD). Required for price and room availability; omit it and price/room columns come back empty. Format YYYY-MM-DD.",
        )
        .optional(),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Check-out date (YYYY-MM-DD). Required alongside check-in for pricing. Format YYYY-MM-DD.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Maximum number of listings to return. Use 0 for all.")
        .optional(),
    propertyType: z.string()
        .describe(
            "Filter to a property type (Hotels, Apartments, Villas, Guest houses, Hostels, B&Bs, Resorts, Homestays).",
        )
        .optional(),
    starsCountFilter: z.string()
        .describe(
            "Filter to properties with at least this official star class (1-5).",
        )
        .optional(),
    minScore: z.number()
        .describe(
            "Filter to properties with at least this guest score (0-10, e.g. 8.5).",
        )
        .optional(),
    minMaxPrice: z.string()
        .describe(
            "Nightly/total price range for the searched dates, as min and max in the chosen currency (e.g. 150 to 400).",
        )
        .optional(),
    sortBy: z.string()
        .describe("Result sort order (defaults to relevance).")
        .optional(),
    currency: z.string()
        .describe(
            "Currency for prices (EUR, USD, GBP, JPY, INR, MXN, AUD, CAD, …).",
        )
        .optional(),
    language: z.string()
        .describe("Language/locale for the property data.")
        .optional(),
    urls: z.array(z.string())
        .describe(
            "By URL: Booking.com hotel URLs or search-page URLs. Add check-in/check-out dates for price and room availability.",
        )
        .optional(),
}).strict();
