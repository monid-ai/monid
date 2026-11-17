import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `email/role` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/email/role). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zEmailRoleBody = z.object({
    domains: z.array(z.string())
        .describe(
            "Company website domains to read, without https:// (for example stripe.com or basecamp.com). Each domain returns one row per email address found on its site.",
        ),
    maxResults: z.number().int()
        .describe(
            "How many email addresses to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
}).strict();
