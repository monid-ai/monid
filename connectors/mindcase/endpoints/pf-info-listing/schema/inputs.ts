import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `pf-info/listing` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/pf-info/listing). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zPfInfoListingBody = z.object({
    names: z.array(z.string())
        .describe(
            "One or more establishment or company names to search the EPFO register for, e.g. INFOSYS. Each name returns every establishment the register matches, one row each, up to 100, which is the register's own ceiling.",
        ),
    maxResults: z.number().int().max(100)
        .describe(
            "Stop after this many matches have been returned. Each match costs a row, so this caps the bill as well as the output. But the register's order is regional, not best-match, so a low cap is an arbitrary slice rather than the closest names. 0 or omitted means every match found, which on a broad name is up to 100 per name.",
        )
        .optional(),
}).strict();
