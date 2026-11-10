import { z } from "zod";

/** GET /apis/{slug}/best (api.datacircle.dev/v1/openapi.json, 2026-11-09). */
export const zBestPathParams = z.object({
    slug: z.string().min(1).describe(
        "The API's slug as the list endpoint gives it. Example: linkedin-profile.",
    ),
}).strict();

export const zBestQueryParams = z.object({
    limit: z.number().int().min(1).max(50).optional().describe(
        "How many plans to give, 1 to 50. 10 when left out.",
    ),
}).strict();
