import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `airbnb/listings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/airbnb/listings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAirbnbListingsBody = z.object({
    urls: z.array(z.string())
        .describe(
            "Airbnb listing URLs (https://www.airbnb.com/rooms/...) to fetch details for.",
        )
        .optional(),
    location: z.string()
        .describe(
            'Place to search (e.g. "Paris, France" or "Lisbon"). Returns listings in that area.',
        )
        .optional(),
    maxResults: z.number().int().min(1).max(5000)
        .describe(
            "How many listings to return from a location search. Defaults to 100; at most 5,000. Not used with listing URLs, which return one listing per URL.",
        )
        .optional(),
    priceMin: z.number().int()
        .describe("Minimum nightly price filter (location search only).")
        .optional(),
    priceMax: z.number().int()
        .describe("Maximum nightly price filter (location search only).")
        .optional(),
    minBedrooms: z.number().int()
        .describe("Minimum number of bedrooms (location search only).")
        .optional(),
    minBeds: z.number().int()
        .describe("Minimum number of beds (location search only).")
        .optional(),
    minBathrooms: z.number().int()
        .describe("Minimum number of bathrooms (location search only).")
        .optional(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Check-in date for availability and price. Format YYYY-MM-DD.",
        )
        .optional(),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Check-out date for availability and price. Format YYYY-MM-DD.",
        )
        .optional(),
    adults: z.number().int()
        .describe("Number of adults in the party.")
        .optional(),
    children: z.number().int()
        .describe("Number of children (ages 2-12).")
        .optional(),
    infants: z.number().int()
        .describe("Number of infants (under 2).")
        .optional(),
    pets: z.number().int()
        .describe("Number of pets.")
        .optional(),
    locale: z.string()
        .describe(
            "Language and region for the listing data. Accepts one of 93 values; list them with GET https://api.mindcase.co/v1/data/airbnb/listings?expand=options.",
        )
        .optional(),
    currency: z.enum([
        "USD",
        "CZK",
        "AUD",
        "BRL",
        "BGN",
        "CAD",
        "CLP",
        "CNY",
        "COP",
        "CRC",
        "HRK",
        "DKK",
        "EGP",
        "AED",
        "EUR",
        "GHS",
        "HKD",
        "HUF",
        "INR",
        "IDR",
        "ILS",
        "JPY",
        "KZT",
        "KES",
        "MYR",
        "MXN",
        "MAD",
        "TWD",
        "NZD",
        "NOK",
        "PEN",
        "PHP",
        "PLN",
        "GBP",
        "QAR",
        "RON",
        "SAR",
        "SGD",
        "ZAR",
        "KRW",
        "SEK",
        "CHF",
        "THB",
        "TRY",
        "UGX",
        "UAH",
        "UYU",
        "VND",
    ])
        .describe("Currency for prices.")
        .optional(),
}).strict();
