import { z } from "zod";

/** `GET /v1/traces/{id}` path parameters. */
export const zTraceStatusPathParams = z.object({
    id: z.string().min(1).describe(
        "The trace id, returned as `id` by pressfront#traces.",
    ),
});

/** `GET /v1/traces/{id}` query parameters. */
export const zTraceStatusQueryParams = z.object({
    wait: z.number().int().min(0).max(25).optional().describe(
        "Hold the answer up to this many seconds (1 to 25) until the trace " +
            "finishes. Omit for an immediate answer.",
    ),
});
