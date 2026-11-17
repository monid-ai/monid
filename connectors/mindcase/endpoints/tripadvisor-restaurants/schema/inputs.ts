import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tripadvisor/restaurants` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tripadvisor/restaurants). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTripadvisorRestaurantsBody = z.object({
    query: z.string()
        .describe(
            "A location name or keyword to search, e.g. 'Paris' or 'Rome restaurants'. Use English place names for best coverage. (By Search mode.).",
        )
        .optional(),
    startUrls: z.string()
        .describe(
            "A TripAdvisor search or restaurant page URL to extract listings from. (By URL mode.).",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of restaurants to return. Use 0 for all.")
        .optional(),
    language: z.string()
        .describe("Language for the listing data.")
        .optional(),
    currency: z.string()
        .describe("Currency for prices.")
        .optional(),
    includeTags: z.boolean()
        .describe(
            'Pull review category tags (e.g. "Romantic", "Special occasion").',
        )
        .optional(),
    maxPhotosPerPlace: z.number().int()
        .describe(
            "Photos to fetch per restaurant. Use 0 for none. Billed as an add-on per delivered photo.",
        )
        .optional(),
    photosType: z.enum(["fromEveryone", "fromManagement", "fromTravelers"])
        .describe("Which photo source to pull from.")
        .optional(),
}).strict();
