import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `leads/contacts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/leads/contacts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLeadsContactsBody = z.object({
    websites: z.array(z.string())
        .describe(
            "Websites to look up, one per item, as a URL starting with https:// or a www. address (e.g. https://www.eff.org). Give the home page; the contact and imprint pages are found automatically. Each website returns one row; the same website listed twice returns one row.",
        ),
    maxResults: z.number().int()
        .describe(
            "How many websites to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
