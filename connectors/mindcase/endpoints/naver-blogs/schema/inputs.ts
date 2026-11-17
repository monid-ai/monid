import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `naver/blogs` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/naver/blogs). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zNaverBlogsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many blogs to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    sort: z.enum(["both", "relevance", "recency"])
        .describe("Sort to use. 정확도순 (best match) by default.")
        .optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Date From as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Date To as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
}).strict();
