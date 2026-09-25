import { z } from "zod";

/** GET /events/{event_id}/splits path params (lumify.ai/docs). */
export const zEventSplitsPathParams = z.object({
    event_id: z.string().min(1).describe(
        "Event id (from List Events).",
    ),
}).strict();
