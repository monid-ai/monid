import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `espn/scores` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/espn/scores). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zEspnScoresBody = z.object({
    leagues: z.array(
        z.enum([
            "nfl",
            "college-football",
            "ufl",
            "nba",
            "wnba",
            "mens-college-basketball",
            "womens-college-basketball",
            "mlb",
            "college-baseball",
            "nhl",
            "epl",
            "efl-championship",
            "fa-cup",
            "carabao-cup",
            "la-liga",
            "serie-a",
            "bundesliga",
            "ligue-1",
            "eredivisie",
            "primeira-liga",
            "mls",
            "liga-mx",
            "saudi-pro-league",
            "brasileirao",
            "liga-argentina",
            "ucl",
            "uel",
            "uecl",
            "world-cup",
            "womens-world-cup",
            "euro",
            "copa-america",
            "nwsl",
            "ufc",
            "pfl",
            "boxing",
            "f1",
            "nascar",
            "indycar",
            "pga",
            "lpga",
        ]),
    )
        .describe(
            "Leagues to get scores for, e.g. nba, nfl or epl (Premier League). One request reads them all. Defaults to NFL, NBA, MLB, NHL and Premier League.",
        )
        .optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Day to get scores for, e.g. 2026-10-31 (20261031 also works). Defaults to today. Format YYYY-MM-DD.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many scores to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
