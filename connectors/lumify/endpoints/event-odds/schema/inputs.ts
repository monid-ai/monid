import { z } from "zod";

/** GET /events/{event_id}/odds path params (lumify.ai/docs). */
export const zEventOddsPathParams = z.object({
    event_id: z.string().min(1).describe(
        "Event id (from List Events).",
    ),
}).strict();

/** GET /events/{event_id}/odds query params (lumify.ai/docs). */
export const zEventOddsQueryParams = z.object({
    bookmaker: z.string().min(1).optional().describe(
        "Sportsbook slug, e.g. 'pinnacle', 'fanduel', 'draftkings', 'betmgm', 'caesars'. Defaults to the sharpest book.",
    ),
}).strict();
