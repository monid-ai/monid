import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `soundcloud/tracks` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/soundcloud/tracks). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSoundcloudTracksBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all.")
        .optional(),
    maxResults: z.number().int().max(1000)
        .describe(
            "How many tracks to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    postedAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Posted After as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    postedBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Posted Before as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
}).strict();
