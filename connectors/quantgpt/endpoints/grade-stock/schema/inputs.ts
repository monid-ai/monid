import { z } from "zod";

/**
 * `POST /api/v1/tools/grade_stock` body: the tool's own inputSchema
 * (GET /api/v1/tools, 2026-11-20). `ticker` is the one required argument.
 * Mirror carries optionality only (D25); bounds live at the binding.
 */
export const zGradeStockBody = z.object({
    ticker: z.string().describe(
        "One US stock ticker, e.g. MSFT. Share classes use a dot (BRK.B).",
    ),
    charts: z.boolean().describe(
        "Also return URLs of a chart pack for the grade. On this door the " +
            "default is false (no chart pack unless asked for).",
    ).optional(),
});
