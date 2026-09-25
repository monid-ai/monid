import { z } from "zod";

/** Faithful mirror of the live `find_places` inputSchema (Dim Hour MCP
 *  tools/list, 2026-09-24): optionality and the source's own bounds only,
 *  no defaults (design D25). */
export const zFindPlacesBody = z.strictObject({
    city: z.string().describe("City name or key from list_cities"),
    looking_for: z.string().describe(
        "What the occasion needs, e.g. 'omakase', 'patio', 'birthday dinner'",
    ).optional(),
    neighborhood: z.string().describe("Narrow to a neighborhood").optional(),
    max_price: z.number().int().min(1).max(4).describe("Max price tier 1-4")
        .optional(),
    limit: z.number().int().min(1).max(25).describe("Max results, default 6")
        .optional(),
});
