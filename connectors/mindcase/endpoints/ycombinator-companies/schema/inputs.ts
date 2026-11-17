import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ycombinator/companies` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ycombinator/companies). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYcombinatorCompaniesBody = z.object({
    urls: z.array(z.string())
        .describe(
            "Company page URLs (https://www.ycombinator.com/companies/<slug>) or bare slugs. Slugs are lowercase - the site 404s on any other casing.",
        )
        .optional(),
    batch: z.string()
        .describe(
            "YC batch, e.g. `W25` or `Winter 2025` - both spellings work. The list is YC's own; any other spelling can still be sent through the API. Accepts one of 51 values; list them with GET https://api.mindcase.co/v1/data/ycombinator/companies?expand=options.",
        )
        .optional(),
    industry: z.string()
        .describe(
            "Top-level industry, e.g. `Healthcare`, `B2B`, `Consumer`. Accepts one of 59 values; list them with GET https://api.mindcase.co/v1/data/ycombinator/companies?expand=options.",
        )
        .optional(),
    subindustry: z.string()
        .describe(
            "Narrower industry, in YC's arrow form, e.g. `Fintech -> Payments`. The leaf alone (`Payments`) works when only one industry has it. Accepts one of 59 values; list them with GET https://api.mindcase.co/v1/data/ycombinator/companies?expand=options.",
        )
        .optional(),
    region: z.string()
        .describe("e.g. `United States of America`, `India`.")
        .optional(),
    tag: z.string()
        .describe(
            "A company tag in YC's own spelling, e.g. `AI`, `SaaS`, `Developer Tools`. A tag YC does not use is refused with the closest real ones.",
        )
        .optional(),
    status: z.string()
        .describe("`Active`, `Acquired`, `Public` or `Inactive`.")
        .optional(),
    top_company: z.boolean()
        .describe("Only YC's own top-company list.")
        .optional(),
    is_hiring: z.boolean()
        .describe("Only companies with open roles.")
        .optional(),
    nonprofit: z.boolean()
        .describe("Only nonprofits.")
        .optional(),
    query: z.string()
        .describe("Free-text search across the directory.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "Stop after this many companies. Each one costs a row, so this caps the bill as well as the output. Omitted means every match.",
        )
        .optional(),
}).strict();
