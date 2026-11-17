import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `wechat/channels` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/wechat/channels). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWechatChannelsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all."),
    sortBy: z.enum(["relevance", "latest", "hot"])
        .describe("Sort By to use. 综合 · 相关度优先 (Relevance) by default.")
        .optional(),
    publishedWithin: z.enum(["all", "day", "week", "halfYear"])
        .describe("Published Within to use. 不限 (Any time) by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many videos to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
}).strict();
