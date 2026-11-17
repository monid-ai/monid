import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linktree/profiles` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linktree/profiles). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinktreeProfilesBody = z.object({
    profiles: z.array(z.string())
        .describe("One or more profiles. One request reads them all."),
}).strict();
