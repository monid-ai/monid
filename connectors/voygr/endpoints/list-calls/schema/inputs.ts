import { z } from "zod";

/** `GET /calls`. */
export const zListCallsQueryParams = z.strictObject({
    limit: z.number().int().min(1).max(1000).optional().describe(
        "The most calls to return. VOYGR's default is 100.",
    ),
});
