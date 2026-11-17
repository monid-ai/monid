import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ip/company` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ip/company). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zIpCompanyBody = z.object({
    ips: z.array(z.string())
        .describe("One or more ips. One request reads them all."),
}).strict();
