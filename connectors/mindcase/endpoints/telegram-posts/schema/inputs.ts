import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `telegram/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/telegram/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTelegramPostsBody = z.object({
    channels: z.array(z.string())
        .describe("One or more channels. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many posts to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    onlyPostsNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only Posts Newer Than as a date (YYYY-MM-DD). Format YYYY-MM-DD.",
        )
        .optional(),
    onlyPostsOlderThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only Posts Older Than as a date (YYYY-MM-DD). Format YYYY-MM-DD.",
        )
        .optional(),
}).strict();
