import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `yelp/business` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/yelp/business). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYelpBusinessBody = z.object({
    urls: z.array(z.string())
        .describe(
            "Yelp business page URL to fetch (e.g. https://www.yelp.com/biz/molinari-delicatessen-san-francisco).",
        )
        .optional(),
    location: z.string()
        .describe(
            'City, region, or address to search within (e.g. "San Francisco, CA"). Used with Keyword.',
        )
        .optional(),
    keyword: z.string()
        .describe(
            "What to search for in the location: a plain term, not a URL (e.g. coffee, restaurants, plumbers, dentist).",
        )
        .optional(),
    sort: z.enum(["recommended", "rating", "review_count"])
        .describe("Search result ordering.")
        .optional(),
    priceLevels: z.array(z.enum(["1", "2", "3", "4"]))
        .describe("Search filter: restrict to price bands $ to $$$$.")
        .optional(),
    features: z.array(z.string())
        .describe(
            "Search filter: restrict to businesses with these features (e.g. Wheelchair Accessible, Dogs Allowed, Free WiFi).",
        )
        .optional(),
    limit: z.number().int().min(1).max(1000)
        .describe(
            "How many businesses to return, up to 1000. Each one costs a row, so this caps the bill as well as the output. Omit for as many as match.",
        )
        .optional(),
}).strict();
