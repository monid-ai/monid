import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `github/repositories-trending` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/github/repositories-trending). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGithubRepositoriesTrendingBody = z.object({
    language: z.string()
        .describe(
            "Programming language to filter by, e.g. python, javascript, rust. Leave empty for all languages.",
        )
        .optional(),
    period: z.enum(["daily", "weekly", "monthly"])
        .describe("Trending today, this week or this month. Today by default.")
        .optional(),
    spokenLanguage: z.string()
        .describe(
            "Spoken language of the repositories as a two-letter code, e.g. en, zh, es. Leave empty for all.",
        )
        .optional(),
    maxResults: z.number().int().max(25)
        .describe(
            "How many repositories to return in total. Defaults to 25 (the maximum per run); use 0 for all.",
        )
        .optional(),
}).strict();
