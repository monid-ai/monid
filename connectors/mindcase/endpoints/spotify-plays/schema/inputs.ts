import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `spotify/plays` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/spotify/plays). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSpotifyPlaysBody = z.object({
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many plays to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
