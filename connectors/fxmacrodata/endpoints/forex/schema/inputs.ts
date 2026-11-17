import { z } from "zod";
import { zCurrency, zDate } from "../../../schema/common.ts";

export const zForexPathParams = z.object({
    base: zCurrency.describe("Base currency code, upper case."),
    quote: zCurrency.describe("Quote currency code, upper case."),
});

/** GET /v1/forex/{base}/{quote} query params (published OpenAPI). */
export const zForexQueryParams = z.object({
    start_date: zDate.describe(
        "Start date YYYY-MM-DD (default 365 days ago).",
    ).optional(),
    end_date: zDate.describe("End date YYYY-MM-DD (default today).")
        .optional(),
    limit: z.number().int().describe(
        "Rows per page, most recent first (default 20, max 100).",
    ).optional(),
    offset: z.number().int().describe(
        "Rows to skip, for offset pagination (default 0).",
    ).optional(),
    page: z.number().int().describe(
        "One-based page number; takes precedence over offset.",
    ).optional(),
    indicators: z.string().describe(
        "Comma-separated technical indicators computed on the series: " +
            "adx_14, atr_14, bollinger_bands, cci_20, donchian_20, ema_12, " +
            "ema_20, ema_26, ema_50, ema_200, macd, macd_signal, " +
            "macd_histogram, rsi_14, sma_20, sma_50, sma_200, " +
            "stochastic_14_3, williams_r_14, or `all`.",
    ).optional(),
    dataset_version: z.string().describe(
        "Content version from the first page's response. Sending it on " +
            "later pages pins the read; if the history changed the API " +
            "returns 409 and the download should restart.",
    ).nullable().optional(),
}).strict();
