import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `mca/director` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/mca/director). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zMcaDirectorBody = z.object({
    queries: z.array(z.string())
        .describe(
            "One or more 8-digit Director Identification Numbers, zero-padded, e.g. 00000001. Each DIN returns one row; a DIN with no directorships returns no row and is not charged. ONE BAD DIN DOES NOT SINK THE BATCH: anything that is not a valid DIN is skipped, the rest are looked up, and the run tells you which ones were skipped.",
        ),
    maxResults: z.number().int()
        .describe(
            "Stop after this many have been looked up. Each one costs a row, so this caps the bill as well as the output. 0 or omitted means every identifier you sent.",
        )
        .optional(),
}).strict();
