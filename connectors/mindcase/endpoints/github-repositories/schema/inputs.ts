import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `github/repositories` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/github/repositories). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGithubRepositoriesBody = z.object({
    query: z.string()
        .describe("Search Query."),
    sort: z.enum(["best-match", "stars", "forks", "updated"])
        .describe("Sort to use. Best match by default.")
        .optional(),
    order: z.enum(["desc", "asc"])
        .describe("Order to use. Descending by default.")
        .optional(),
    maxResults: z.number().int().max(1000)
        .describe(
            "How many repositories to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    language: z.string()
        .describe(
            "Only repositories whose main language is this, e.g. python, typescript, go, rust. Leave empty for all languages.",
        )
        .optional(),
}).strict();
