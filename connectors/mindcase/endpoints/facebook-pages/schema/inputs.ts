import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/pages` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/pages). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookPagesBody = z.object({
    pageUrls: z.array(z.string())
        .describe(
            'A Facebook page to look up, either a handle like "nike" or a full URL like https://www.facebook.com/NASA/. Duplicate inputs are removed before the run.',
        ),
}).strict();
