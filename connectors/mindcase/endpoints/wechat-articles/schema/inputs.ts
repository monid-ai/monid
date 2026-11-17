import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `wechat/articles` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/wechat/articles). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWechatArticlesBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    accounts: z.array(z.string())
        .describe("One or more accounts. One request reads them all.")
        .optional(),
    sort: z.enum(["default", "latest", "hot"])
        .describe("Sort to use. Relevance by default.")
        .optional(),
    publishedAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Published After as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many articles to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
