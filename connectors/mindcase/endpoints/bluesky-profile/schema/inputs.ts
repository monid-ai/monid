import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `bluesky/profile` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/bluesky/profile). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zBlueskyProfileBody = z.object({
    handles: z.array(z.string())
        .describe("One or more handles. One request reads them all."),
}).strict();
