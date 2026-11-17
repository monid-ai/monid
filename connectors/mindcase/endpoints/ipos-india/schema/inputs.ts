import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ipos/india` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ipos/india). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zIposIndiaBody = z.object({
    board: z.enum(["all", "mainboard", "sme"])
        .describe("Which IPOs: Mainboard, SME, or all. All by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many IPOs to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
