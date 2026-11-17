import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tripadvisor/hotels` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tripadvisor/hotels). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTripadvisorHotelsBody = z.object({
    query: z.string()
        .describe(
            "A location name or keyword to search, e.g. 'Paris' or 'Lisbon hotels'. Use English place names for best coverage. (By Search mode.).",
        )
        .optional(),
    startUrls: z.string()
        .describe(
            "A TripAdvisor search results page or hotel page URL to extract hotels from. (By URL mode.).",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of hotels to return. Use 0 for all.")
        .optional(),
    language: z.string()
        .describe("Language for the listing data.")
        .optional(),
    currency: z.string()
        .describe("Currency for prices.")
        .optional(),
    includeTags: z.boolean()
        .describe(
            'Pull review category tags (e.g. "Family-friendly", "Romantic").',
        )
        .optional(),
    checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Check-in date for room pricing and offers. Format YYYY-MM-DD.",
        )
        .optional(),
    checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Check-out date for room pricing and offers. Format YYYY-MM-DD.",
        )
        .optional(),
    maxPhotosPerPlace: z.number().int()
        .describe(
            "Photos to fetch per hotel. Use 0 for none. Billed as an add-on per delivered photo.",
        )
        .optional(),
    photosType: z.enum(["fromEveryone", "fromManagement", "fromTravelers"])
        .describe("Which photo source to pull from.")
        .optional(),
}).strict();
