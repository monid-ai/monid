import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ycombinator/founders` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ycombinator/founders). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYcombinatorFoundersBody = z.object({
    urls: z.array(z.string())
        .describe(
            "Founder slugs from a previous run's `ycUrl` or `urlSlug`. YC has no standalone founder page, so these cannot be copied out of a browser.",
        )
        .optional(),
    batch: z.enum([
        "S27",
        "W27",
        "F26",
        "S26",
        "P26",
        "W26",
        "F25",
        "S25",
        "P25",
        "W25",
        "F24",
        "S24",
        "W24",
        "S23",
        "W23",
        "S22",
        "W22",
        "S21",
        "W21",
        "S20",
        "W20",
        "S19",
        "W19",
        "S18",
        "W18",
        "S17",
        "W17",
        "S16",
        "W16",
        "S15",
        "W15",
        "S14",
        "W14",
        "S13",
        "W13",
        "S12",
        "W12",
        "S11",
        "W11",
        "S10",
        "W10",
        "S09",
        "W09",
        "S08",
        "W08",
        "S07",
        "W07",
        "S06",
        "W06",
        "S05",
    ])
        .describe("YC batch, e.g. `W25` or `Winter 2025`.")
        .optional(),
    title: z.string()
        .describe("Founder title, e.g. `CTO`, `CEO`.")
        .optional(),
    industry: z.string()
        .describe(
            "Industry of the founder's company. Accepts one of 59 values; list them with GET https://api.mindcase.co/v1/data/ycombinator/founders?expand=options.",
        )
        .optional(),
    parent_industry: z.enum([
        "B2B",
        "Consumer",
        "Education",
        "Fintech",
        "Government",
        "Healthcare",
        "Industrials",
        "Real Estate and Construction",
        "Unspecified",
    ])
        .describe("Top-level industry, e.g. `B2B`.")
        .optional(),
    subindustry: z.string()
        .describe(
            "Narrower industry, in YC's arrow form, e.g. `Consumer -> Food and Beverage`. The form narrows it by Parent industry; the API accepts it on its own. Accepts one of 59 values; list them with GET https://api.mindcase.co/v1/data/ycombinator/founders?expand=options.",
        )
        .optional(),
    region: z.string()
        .describe("e.g. `United States of America`.")
        .optional(),
    top_company: z.boolean()
        .describe("Only founders of YC top companies.")
        .optional(),
    query: z.string()
        .describe("Free-text search across founders.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "Stop after this many founders. Each one costs a row, so this caps the bill as well as the output. Omitted means every match.",
        )
        .optional(),
}).strict();
