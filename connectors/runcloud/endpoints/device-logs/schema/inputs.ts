import { z } from "zod";

/** `GET /run-cloud/{platform}/{sessionId}/logs` query parameters
 *  (`follow=1` streaming is not exposed: a run returns one snapshot). */
export const zDeviceLogsQueryParams = z.object({
    tail: z.number().int().min(1).max(1_000).optional().describe(
        "How many of the most recent log lines to return (1-1000).",
    ),
}).strict();
