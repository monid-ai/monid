import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `pexels/photos` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/pexels/photos). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zPexelsPhotosBody = z.object({
    query: z.string()
        .describe("Search Query."),
    maxResults: z.number().int()
        .describe(
            "How many photos to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    orientation: z.enum(["landscape", "portrait", "square"])
        .describe("Orientation to use.")
        .optional(),
    color: z.string()
        .describe("Color.")
        .optional(),
}).strict();
