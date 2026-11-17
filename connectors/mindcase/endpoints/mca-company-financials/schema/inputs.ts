import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `mca/company-financials` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/mca/company-financials). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zMcaCompanyFinancialsBody = z.object({
    queries: z.array(z.string())
        .describe(
            "One or more 21-character Corporate Identity Numbers, e.g. L23201MH1952GOI008858. Each CIN returns one row. ONE BAD CIN DOES NOT SINK THE BATCH: anything that is not a valid CIN is skipped, the rest are looked up, and the run tells you which ones were skipped. Use `names` if you do not have the CIN.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "Stop after this many have been looked up. Each ROW costs, so this caps the bill as well as the output. With `names` it bounds the companies resolved, so you may get fewer rows than this if some have no financials on file. 0 or omitted means every identifier you sent, and for a NAME that means every company the name resolves to, up to 50. Set it when you send a name you have not narrowed.",
        )
        .optional(),
    names: z.array(z.string())
        .describe(
            "One or more company names, or parts of one. Matching is case-insensitive and tries an exact prefix first, then a substring. ONE NAME CAN MATCH SEVERAL COMPANIES and each match with statements on file is a row, so use maxResults to bound a broad name.",
        )
        .optional(),
}).strict();
