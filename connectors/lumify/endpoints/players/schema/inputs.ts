import { z } from "zod";

/** GET /players query params — the faithful vendor mirror
 *  (lumify.ai/docs). Optionality only; no defaults. */
export const zPlayersQueryParams = z.object({
    sport: z.string().min(1).optional().describe(
        "Sport slug, e.g. 'tennis' (from List Sports).",
    ),
    q: z.string().min(1).optional().describe(
        "Free-text search over player names.",
    ),
    country: z.string().min(1).optional().describe(
        "Country to filter by.",
    ),
    active: z.boolean().optional().describe(
        "Only active players when true.",
    ),
    ranked: z.boolean().optional().describe(
        "Only ranked players when true.",
    ),
    after_id: z.number().int().optional().describe(
        "Cursor: return players after this player id.",
    ),
    limit: z.number().int().positive().optional().describe(
        "Maximum number of players to return (server default 25).",
    ),
}).strict();
