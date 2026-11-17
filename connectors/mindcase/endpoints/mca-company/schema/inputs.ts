import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `mca/company` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/mca/company). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zMcaCompanyBody = z.object({
    queries: z.array(z.string())
        .describe(
            "One or more 21-character Corporate Identity Numbers, e.g. L23201MH1952GOI008858. Each CIN returns one row; a CIN that is not in the register returns no row and is not charged. ONE BAD CIN DOES NOT SINK THE BATCH: anything that is not a valid CIN is skipped, the rest are looked up, and the run tells you which ones were skipped. Use `names` if you do not have the CIN.",
        )
        .optional(),
    include: z.array(z.string())
        .describe(
            'Which optional blocks to fetch. Defaults to ["directors","financials"]; drop one to skip that lookup.',
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "Stop after this many have been looked up. Each one costs a row, so this caps the bill as well as the output. 0 or omitted means every identifier you sent.",
        )
        .optional(),
    names: z.array(z.string())
        .describe(
            'One or more company names, or parts of one. Matching is case-insensitive and tries an exact prefix first, then a substring, so "reliance industries" finds RELIANCE INDUSTRIES LIMITED. ONE NAME CAN MATCH SEVERAL COMPANIES and each match is a row, so use maxResults to bound a broad name.',
        )
        .optional(),
}).strict();
