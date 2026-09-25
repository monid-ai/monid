import { z } from "zod";

/** Faithful mirror of the live `get_hours` inputSchema (Dim Hour MCP
 *  tools/list, 2026-09-24): optionality and the source's own bounds only,
 *  no defaults (design D25). */
export const zGetHoursBody = z.strictObject({
    city: z.string().describe("City name or key"),
    id: z.number().int().describe("Venue id from search_venues").optional(),
    name: z.string().describe("Venue name (used if id not given)").optional(),
});
