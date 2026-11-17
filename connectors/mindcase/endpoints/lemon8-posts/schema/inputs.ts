import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `lemon8/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/lemon8/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLemon8PostsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    hashtags: z.array(z.string())
        .describe("One or more hashtags. One request reads them all.")
        .optional(),
    country: z.enum([
        "us",
        "uk",
        "ca",
        "au",
        "nz",
        "jp",
        "th",
        "id",
        "vn",
        "my",
        "sg",
        "ph",
    ])
        .describe("Country to use. United States by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many posts to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
