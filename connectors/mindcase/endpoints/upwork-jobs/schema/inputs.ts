import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `upwork/jobs` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/upwork/jobs). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zUpworkJobsBody = z.object({
    inputs: z.string()
        .describe(
            "Search keyword or phrase to find Upwork job postings (e.g. 'python developer').",
        ),
    limit: z.number().int().min(5).max(500)
        .describe("Number of jobs to return (5-500). Use 0 for all.")
        .optional(),
    sortBy: z.enum(["relevance", "newest"])
        .describe("Sort order for results.")
        .optional(),
    isHourly: z.boolean()
        .describe("Include jobs with hourly pricing.")
        .optional(),
    hourlyMinPrice: z.number().int()
        .describe(
            'Lowest hourly rate. Only applies when "Include Hourly Jobs" is on.',
        )
        .optional(),
    hourlyMaxPrice: z.number().int()
        .describe(
            'Highest hourly rate. Only applies when "Include Hourly Jobs" is on.',
        )
        .optional(),
    isFixed: z.boolean()
        .describe("Include jobs with a fixed total budget.")
        .optional(),
    fixedMinPrice: z.number().int()
        .describe(
            'Lowest fixed budget. Only applies when "Include Fixed-Price Jobs" is on.',
        )
        .optional(),
    fixedMaxPrice: z.number().int()
        .describe(
            'Highest fixed budget. Only applies when "Include Fixed-Price Jobs" is on.',
        )
        .optional(),
    experienceLevel: z.array(
        z.enum(["EntryLevel", "IntermediateLevel", "ExpertLevel"]),
    )
        .describe("Filter by required experience level.")
        .optional(),
    clientHistory: z.array(z.enum(["0", "1-9", "10-"]))
        .describe("Filter by the client's hiring history on Upwork.")
        .optional(),
    projectLength: z.array(z.enum(["week", "month", "semester", "ongoing"]))
        .describe("Filter by project duration.")
        .optional(),
    hoursPerWeek: z.array(z.enum(["part_time", "full_time"]))
        .describe("Filter by required commitment.")
        .optional(),
    location: z.array(z.string())
        .describe(
            "Filter results by the client's country (e.g. 'United States').",
        )
        .optional(),
}).strict();
