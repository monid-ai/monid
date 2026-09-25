import { z } from "zod";

/** Faithful mirror of the live `search` inputSchema (Dim Hour MCP
 *  tools/list, 2026-09-24): optionality and the source's own bounds only,
 *  no defaults (design D25). */
export const zSearchBody = z.strictObject({
    query: z.string().describe(
        "What to look for, e.g. 'best ramen in NYC', 'michelin dallas', 'rooftop bar miami'",
    ),
});
