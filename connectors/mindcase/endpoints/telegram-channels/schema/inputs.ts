import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `telegram/channels` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/telegram/channels). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTelegramChannelsBody = z.object({
    channels: z.array(z.string())
        .describe("The Telegram channel usernames or t.me links to look up."),
}).strict();
