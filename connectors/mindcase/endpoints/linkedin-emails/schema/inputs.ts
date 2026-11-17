import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/emails` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/emails). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinEmailsBody = z.object({
    urls: z.array(z.string())
        .describe(
            "LinkedIn profile URLs to find work emails for, one per line. /in/ URLs, old /pub/ links and bare profile names are accepted. Company pages, post URLs and search URLs are not profiles and will not resolve.",
        ),
}).strict();
