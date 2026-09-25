import { z } from "zod";

/** GET /teams query params — the faithful vendor mirror
 *  (lumify.ai/docs). Optionality only; no defaults. */
export const zTeamsQueryParams = z.object({
    sport: z.string().min(1).optional().describe(
        "Sport slug, e.g. 'nba' (from List Sports).",
    ),
    league: z.string().min(1).optional().describe(
        "League slug to filter by.",
    ),
    conference: z.string().min(1).optional().describe(
        "Conference to filter by.",
    ),
    division: z.string().min(1).optional().describe(
        "Division to filter by.",
    ),
    country: z.string().min(1).optional().describe(
        "Country to filter by.",
    ),
    q: z.string().min(1).optional().describe(
        "Free-text search over team names.",
    ),
    active: z.boolean().optional().describe(
        "Only active teams when true.",
    ),
    after_id: z.number().int().optional().describe(
        "Cursor: return teams after this team id.",
    ),
    limit: z.number().int().positive().optional().describe(
        "Maximum number of teams to return (server default 25).",
    ),
}).strict();
