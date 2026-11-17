import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `reddit/profiles` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/reddit/profiles). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zRedditProfilesBody = z.object({
    usernames: z.array(z.string())
        .describe("One or more usernames. One request reads them all."),
}).strict();
