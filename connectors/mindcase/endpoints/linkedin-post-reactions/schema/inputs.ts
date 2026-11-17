import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/post-reactions` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/post-reactions). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinPostReactionsBody = z.object({
    posts: z.string()
        .describe("LinkedIn post URL to scrape reactions from."),
    maxResults: z.number().int()
        .describe("Number of reactions to return. Use 0 for all.")
        .optional(),
    reactionTypeFilter: z.array(
        z.enum([
            "LIKE",
            "PRAISE",
            "EMPATHY",
            "APPRECIATION",
            "INTEREST",
            "ENTERTAINMENT",
        ]),
    )
        .describe("Filter to specific reaction types. Leave empty for all.")
        .optional(),
}).strict();
