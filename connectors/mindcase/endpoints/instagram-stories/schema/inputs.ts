import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `instagram/stories` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/instagram/stories). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zInstagramStoriesBody = z.object({
    usernames: z.array(z.string())
        .describe(
            "Instagram usernames (e.g. natgeo, cnn) or full profile URLs (e.g. https://www.instagram.com/natgeo/) whose active Stories you want. Accounts with no live story return no rows.",
        ),
}).strict();
