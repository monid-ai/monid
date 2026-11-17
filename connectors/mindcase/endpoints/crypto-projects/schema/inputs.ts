import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `crypto/projects` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/crypto/projects). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCryptoProjectsBody = z.object({
    project: z.array(z.string())
        .describe("Crypto project names or ticker symbols to look up."),
}).strict();
