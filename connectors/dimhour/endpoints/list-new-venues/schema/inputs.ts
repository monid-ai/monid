import { z } from "zod";

/** Faithful mirror of the live `list_new_venues` inputSchema (Dim Hour MCP
 *  tools/list, 2026-09-24): optionality and the source's own bounds only,
 *  no defaults (design D25). */
export const zListNewVenuesBody = z.strictObject({
    city: z.string().describe("Optional city name or key; omit for all cities")
        .optional(),
    days: z.number().int().min(1).max(90).describe(
        "Look-back window in days, default 30 (max 90)",
    ).optional(),
    limit: z.number().int().min(1).max(100).describe("Max results, default 25")
        .optional(),
});
