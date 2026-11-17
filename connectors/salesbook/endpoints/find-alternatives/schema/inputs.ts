import { z } from "zod";
import { zSalesbookSector } from "../../../schema/common.ts";

/**
 * POST /v1/tools/find_alternatives body (OpenAPI v0.5.0, 2026-10-22).
 * Optionality only: `limit`'s vendor default (5) and bounds (1-15) live
 * at the binding.
 */
export const zSalesbookAlternativesBody = z.object({
    company: z.string().describe(
        "The vendor to find alternatives to: a company name, a SalesBook " +
            "id, or a website, e.g. 'Glean'.",
    ),
    sector: zSalesbookSector.describe(
        "Only return alternatives ranked in this sector.",
    ).optional(),
    limit: z.number().int().describe(
        "Maximum number of alternatives (1-15). When omitted, up to 5 are " +
            "returned.",
    ).optional(),
});
