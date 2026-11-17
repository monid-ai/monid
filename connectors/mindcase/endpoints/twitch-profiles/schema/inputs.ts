import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `twitch/profiles` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/twitch/profiles). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTwitchProfilesBody = z.object({
    channels: z.array(z.string())
        .describe("One or more channels. One request reads them all."),
}).strict();
