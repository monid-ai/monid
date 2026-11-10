import { z } from "zod";

/** `GET /calls/{call_id}/events`. */
export const zCallEventsQueryParams = z.strictObject({
    after_event_id: z.number().int().min(0).optional().describe(
        "Return only events whose id is greater than this. Start at 0 " +
            "(the default); to read on, pass the last `id:` you received.",
    ),
});
