import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `threads/profiles` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/threads/profiles). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zThreadsProfilesBody = z.object({
    usernames: z.array(z.string())
        .describe("Threads usernames or profile URLs to look up."),
}).strict();
