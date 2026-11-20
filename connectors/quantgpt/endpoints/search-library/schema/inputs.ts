import { z } from "zod";

/**
 * `POST /api/v1/tools/search_library` body: the tool's own inputSchema
 * (GET /api/v1/tools, 2026-11-20). Every argument is optional; an empty
 * body lists the first entries. Mirror carries optionality only (D25).
 */
export const zSearchLibraryBody = z.object({
    query: z.string().describe(
        "Words to match, in any order, with common synonyms (PEAD = SUE = " +
            "post-earnings drift; 200-day = 10-month SMA timing; turtle = " +
            "Donchian). Names rank above tags, tags above the thesis.",
    ).optional(),
    category: z.string().describe(
        "Limit to one library category. A name no category has is " +
            "searched as extra query words instead, and the answer says so.",
    ).optional(),
    limit: z.number().int().min(1).max(50).describe(
        "How many entries to return, 1 to 50 (default 10).",
    ).optional(),
});
