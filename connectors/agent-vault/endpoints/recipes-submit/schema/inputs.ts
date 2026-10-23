import { z } from "zod";

/**
 * POST /v1/recipes body: the recipe JSON alone, or wrapped as
 * `{recipe, note, verificationRequested}`. The recipe format is the
 * registry's own; it is passed through unchanged.
 */
export const zSubmitRecipeBody = z.object({
    recipe: z.record(z.string(), z.any()).describe(
        "The recipe object, in the Checkout Recipe Registry format. Never include card numbers, passwords or filled values.",
    ),
    note: z.string().max(2000).describe(
        "Evidence published if the recipe is approved. Required when verificationRequested is true.",
    ).optional(),
    verificationRequested: z.boolean().describe(
        "Claims a real purchase, or account creation for a signup recipe. Needs a non-empty `note`.",
    ).optional(),
});
