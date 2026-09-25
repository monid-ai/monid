import { z } from "zod";

/** GET /events query params — the faithful vendor mirror
 *  (lumify.ai/docs). Optionality only; no defaults. */
export const zEventsQueryParams = z.object({
    sport: z.string().min(1).optional().describe(
        "Sport slug, e.g. 'nba' (from List Sports).",
    ),
    league: z.string().min(1).optional().describe(
        "League slug to filter by.",
    ),
    status: z.string().min(1).optional().describe(
        "Event status filter, e.g. 'scheduled', 'live', 'final'.",
    ),
    date: z.iso.date().optional().describe(
        "Single calendar date (YYYY-MM-DD).",
    ),
    from: z.iso.date().optional().describe(
        "Start of a date range (YYYY-MM-DD).",
    ),
    to: z.iso.date().optional().describe(
        "End of a date range (YYYY-MM-DD).",
    ),
    season_id: z.number().int().optional().describe(
        "Restrict to a specific season id.",
    ),
    team_id: z.number().int().optional().describe(
        "Restrict to events for a specific team id.",
    ),
    after_id: z.number().int().optional().describe(
        "Cursor: return events after this event id.",
    ),
    limit: z.number().int().positive().optional().describe(
        "Maximum number of events to return (server default 25).",
    ),
    include_scores: z.boolean().optional().describe(
        "Include live and final scores on each event.",
    ),
    has_recommend: z.boolean().optional().describe(
        "Only events that carry a bet recommendation.",
    ),
    sort: z.string().min(1).optional().describe(
        "Sort order, e.g. 'time'.",
    ),
}).strict();
