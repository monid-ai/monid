import { z } from "zod";

/** Faithful mirror of the live `fetch` inputSchema (Dim Hour MCP
 *  tools/list, 2026-09-24): optionality and the source's own bounds only,
 *  no defaults (design D25). */
export const zFetchBody = z.strictObject({
    id: z.string().describe(
        "Venue id from `search`, in the form 'city:id' e.g. 'nyc:1367'",
    ),
});
