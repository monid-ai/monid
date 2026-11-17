import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `discord/servers` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/discord/servers). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zDiscordServersBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many servers to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
