import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok/download` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok/download). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokDownloadBody = z.object({
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all."),
}).strict();
