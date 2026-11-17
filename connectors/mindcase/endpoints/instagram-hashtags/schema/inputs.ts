import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `instagram/hashtags` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/instagram/hashtags). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zInstagramHashtagsBody = z.object({
    hashtags: z.array(z.string())
        .describe("One or more hashtags. One request reads them all."),
    postsToInclude: z.enum(["top_and_recent", "top_only", "recent_only"])
        .describe("Posts To Include to use. Top and recent by default.")
        .optional(),
}).strict();
