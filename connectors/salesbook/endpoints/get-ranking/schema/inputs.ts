import { z } from "zod";
import { zSalesbookSector } from "../../../schema/common.ts";

/**
 * POST /v1/tools/get_ranking body (OpenAPI v0.5.0, 2026-10-22).
 * Optionality only: `period`'s vendor default ("2026-q4") is not repeated
 * here or at the binding, so the vendor's current period answers.
 */
export const zSalesbookRankingBody = z.object({
    sector: zSalesbookSector.describe("Sector to rank."),
    period: z.string().describe(
        "Ranking period id, e.g. '2026-q4'. Omit for the current period.",
    ).optional(),
});
