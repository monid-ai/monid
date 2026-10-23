import { z } from "zod";

/** POST /v1/tools/get_profile body (OpenAPI v0.5.0, 2026-10-22). */
export const zSalesbookProfileBody = z.object({
    startup_id: z.string().describe(
        "SalesBook company id, as returned by search_startups, get_ranking " +
            "or find_alternatives (ids look like 'cohere-health').",
    ),
});
