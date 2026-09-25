import { z } from "zod";

/** Faithful mirror of the live `list_curated` inputSchema (Dim Hour MCP
 *  tools/list, 2026-09-24): optionality and the source's own bounds only,
 *  no defaults (design D25). */
export const zListCuratedBody = z.strictObject({
    city: z.string().describe("City name or key"),
    list_id: z.string().describe("A list id from the no-arg call").optional(),
});
