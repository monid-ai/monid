import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google-maps/places` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google-maps/places). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoogleMapsPlacesBody = z.object({
    keywords: z.string()
        .describe(
            "What to search for (e.g. 'italian restaurants'). Use this together with Location to discover places. OR leave blank and pass specific URLs in the Place URLs field below.",
        )
        .optional(),
    location: z.string()
        .describe(
            "Where to search (e.g. 'New York, USA'). One location per run. To search several, run them one at a time. Required for keyword search.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe(
            "Specific Google Maps place URLs or Place IDs (e.g. ChIJreV9aqYWdkgROM_boL6YbwA). Use this when you already know the places, as an alternative to Search Terms + Location.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of places to return. Use 0 for all.")
        .optional(),
    minimumRating: z.enum([
        "two",
        "twoAndHalf",
        "three",
        "threeAndHalf",
        "four",
        "fourAndHalf",
    ])
        .describe("Skip places rated below this. Leave empty for no filter.")
        .optional(),
    websiteFilter: z.enum(["allPlaces", "withWebsite", "withoutWebsite"])
        .describe(
            "Filter by website presence. Useful for lead generation (find places without a website).",
        )
        .optional(),
    maxImages: z.number().int()
        .describe(
            "Number of images to fetch per place. 0 = none, 999 = all. More images cost more and slow the run.",
        )
        .optional(),
}).strict();
