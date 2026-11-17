import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `discord/username-check` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/discord/username-check). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zDiscordUsernameCheckBody = z.object({
    usernames: z.array(z.string())
        .describe("One or more usernames. One request reads them all."),
}).strict();
