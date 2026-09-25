import { z } from "zod";

/** GET /events/{event_id}/intelligence path params (lumify.ai/docs). */
export const zEventIntelligencePathParams = z.object({
    event_id: z.string().min(1).describe(
        "Event id (from List Events).",
    ),
}).strict();

/** GET /events/{event_id}/intelligence query params (lumify.ai/docs). */
export const zEventIntelligenceQueryParams = z.object({
    bookmaker: z.string().min(1).optional().describe(
        "Sportsbook slug to anchor the analysis to, e.g. 'pinnacle'.",
    ),
}).strict();
