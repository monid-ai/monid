import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `pf-info/establishment` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/pf-info/establishment). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zPfInfoEstablishmentBody = z.object({
    est_ids: z.array(z.string())
        .describe(
            "One or more FULL 15-character EPFO establishment ids, e.g. KDMAL1567124000: five office letters, a 7-digit establishment number and a 3-digit extension. Each id returns one row.",
        ),
    maxResults: z.number().int()
        .describe(
            "Stop after this many have been looked up. Each one costs a row, so this caps the bill as well as the output. 0 or omitted means every id you sent.",
        )
        .optional(),
}).strict();
