import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `h1b/salaries` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/h1b/salaries). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zH1bSalariesBody = z.object({
    employers: z.array(z.string())
        .describe("One or more employers. One request reads them all."),
    jobTitle: z.string()
        .describe("Job Title.")
        .optional(),
    city: z.string()
        .describe("City.")
        .optional(),
    year: z.enum([
        "All Years",
        "2026",
        "2025",
        "2024",
        "2023",
        "2022",
        "2021",
        "2020",
        "2019",
        "2018",
        "2017",
        "2016",
        "2015",
        "2014",
    ])
        .describe("Year to use. 2024 by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many salaries to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
