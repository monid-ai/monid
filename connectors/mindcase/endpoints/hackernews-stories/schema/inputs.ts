import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `hackernews/stories` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/hackernews/stories). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zHackernewsStoriesBody = z.object({
    feed: z.enum(["top", "new", "best", "ask", "show"])
        .describe(
            "Which Hacker News list to read: Top, New, Best, Ask HN or Show HN. Top by default.",
        )
        .optional(),
    query: z.string()
        .describe(
            "Search stories by keyword, e.g. openai. Leave empty to read the chosen feed.",
        )
        .optional(),
    sortBy: z.enum(["relevance", "date"])
        .describe("Order of search results (only used with a Search Query).")
        .optional(),
    maxResults: z.number().int().max(500)
        .describe(
            "How many stories to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
