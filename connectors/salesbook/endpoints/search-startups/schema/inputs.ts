import { z } from "zod";
import { zSalesbookSector } from "../../../schema/common.ts";

/**
 * POST /v1/tools/search_startups body, mirrored from the published
 * OpenAPI (v0.5.0, 2026-10-22). Optionality only (D25): `limit`'s vendor
 * default (10) and bounds (1-25) live at the binding.
 */
export const zSalesbookSearchBody = z.object({
    query: z.string().describe(
        "Keyword query for the problem or product, e.g. 'shelf analytics' " +
            "or 'prior authorization'.",
    ),
    sector: zSalesbookSector.describe(
        "Sector corpus to search. Omit to search every sector.",
    ).optional(),
    limit: z.number().int().describe(
        "Maximum number of ranked matches to return (1-25). When omitted, " +
            "up to 10 are returned.",
    ).optional(),
});
