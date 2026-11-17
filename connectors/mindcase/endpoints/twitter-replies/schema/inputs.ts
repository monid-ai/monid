import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `twitter/replies` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/twitter/replies). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTwitterRepliesBody = z.object({
    conversation_id: z.string()
        .describe(
            "The tweet to fetch replies for: a tweet/status URL (https://x.com/.../status/<id>) or the bare numeric tweet ID. This is the conversation root.",
        ),
    maxResults: z.number().int()
        .describe("Number of replies to return. Use 0 for all.")
        .optional(),
}).strict();
