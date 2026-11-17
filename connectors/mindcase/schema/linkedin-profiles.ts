import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/profiles` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/profiles). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinProfilesBody = z.object({
    queries: z.array(z.string())
        .describe(
            "LinkedIn profile URLs to fetch full details for (By URL mode). One per line.",
        )
        .optional(),
    searchQuery: z.string()
        .describe(
            "By Search mode: keyword full-text search only, a single domain/role keyword (e.g. 'fintech', 'founder', 'product manager'). Do NOT include years, school names, company names, or job titles here. Use the structured filters for those.",
        )
        .optional(),
    maxProfiles: z.number().int().max(2500)
        .describe(
            "By Search mode: how many matching profiles to enrich, as a multiple of 25 (each search page holds up to 25 profiles). Billed as $0.05 per search page pulled PLUS $0.004 per enriched profile. Leave blank for ALL available matches (up to 2500 / 100 pages).",
        )
        .optional(),
    locations: z.array(z.string()).max(70)
        .describe(
            "By Search: filter to profiles in these locations (e.g. 'San Francisco', 'London'). One per line. Up to 70 per run.",
        )
        .optional(),
    seniorityLevel: z.array(
        z.enum([
            "100",
            "110",
            "120",
            "130",
            "200",
            "210",
            "220",
            "300",
            "310",
            "320",
        ]),
    )
        .describe("By Search: filter to profiles at this seniority level.")
        .optional(),
    function: z.array(
        z.enum([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
        ]),
    )
        .describe("By Search: filter to profiles in this job function.")
        .optional(),
    industry: z.array(z.string()).max(50)
        .describe(
            "By Search: filter to profiles in this industry. Up to 50 per run. Accepts one of 434 values; list them with GET https://api.mindcase.co/v1/data/linkedin/profiles?expand=options.",
        )
        .optional(),
    yearsOfExperience: z.array(z.enum(["1", "2", "3", "4", "5"]))
        .describe(
            "By Search: filter by total career experience. Also the proxy for graduation year: '1' = <1y (just graduated), '2' = 1-2y, '3' = 3-5y, '4' = 6-10y, '5' = >10y.",
        )
        .optional(),
    yearsAtCompany: z.array(z.enum(["1", "2", "3", "4", "5"]))
        .describe(
            "By Search: filter to profiles with this tenure at their current company.",
        )
        .optional(),
    companyHeadcount: z.array(
        z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I"]),
    )
        .describe(
            "By Search: filter to profiles working at companies of this size.",
        )
        .optional(),
    currentCompanies: z.array(z.string()).max(50)
        .describe(
            "By Search: filter to profiles currently at these companies (e.g. Google, Stripe). One per line. Up to 50 per run.",
        )
        .optional(),
    pastCompanies: z.array(z.string()).max(50)
        .describe(
            "By Search: filter to profiles who previously worked at these companies. One per line. Up to 50 per run.",
        )
        .optional(),
    currentJobTitles: z.array(z.string()).max(50)
        .describe(
            "By Search: filter by current job title text (e.g. 'product manager'). One per line. Up to 50 per run.",
        )
        .optional(),
    pastJobTitles: z.array(z.string()).max(50)
        .describe(
            "By Search: filter by past job title text. One per line. Up to 50 per run.",
        )
        .optional(),
    schools: z.array(z.string()).max(50)
        .describe(
            "By Search: filter to alumni of these schools (e.g. Stanford, MIT). One per line. Up to 50 per run.",
        )
        .optional(),
    names: z.array(z.string()).max(50)
        .describe(
            'By Search: filter to profiles by name. One per line, full name ("Sam Altman") or first/last only ("Sam"). Up to 50 per run.',
        )
        .optional(),
    companyHQLocations: z.array(z.string()).max(70)
        .describe(
            "By Search: filter to profiles whose company is headquartered in these locations. One per line. Up to 70 per run.",
        )
        .optional(),
    profileLanguages: z.array(
        z.enum([
            "Arabic",
            "English",
            "Spanish",
            "Portuguese",
            "Chinese",
            "French",
            "Italian",
            "Russian",
            "German",
            "Dutch",
            "Turkish",
            "Tagalog",
            "Polish",
            "Korean",
            "Japanese",
            "Malay",
            "Norwegian",
            "Danish",
            "Romanian",
            "Swedish",
            "Bahasa Indonesia",
            "Czech",
        ]),
    )
        .describe(
            "By Search: filter to profiles written in these LinkedIn profile languages.",
        )
        .optional(),
    recentlyChangedJobs: z.boolean()
        .describe("By Search: only profiles who recently changed jobs.")
        .optional(),
    recentlyPostedOnLinkedIn: z.boolean()
        .describe("By Search: only profiles who posted on LinkedIn recently.")
        .optional(),
}).strict();
