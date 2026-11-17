import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/photos` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/photos). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookPhotosBody = z.object({
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many photos to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    onlyPhotosNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only Photos Newer Than as a date (YYYY-MM-DD). Format YYYY-MM-DD.",
        )
        .optional(),
    onlyPhotosOlderThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only Photos Older Than as a date (YYYY-MM-DD). Format YYYY-MM-DD.",
        )
        .optional(),
}).strict();
