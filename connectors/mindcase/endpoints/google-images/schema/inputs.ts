import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google/images` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google/images). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoogleImagesBody = z.object({
    queries: z.string()
        .describe("Image search query to run on Google Images."),
    maxResults: z.number().int()
        .describe(
            "Number of images to return. Use 0 for all (the full first page, ~300).",
        )
        .optional(),
}).strict();
