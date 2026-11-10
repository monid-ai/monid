import { z } from "zod";

export const queryParamsSchema = z.object({
  ticker: z.string().min(1).max(20).describe("Stock or asset ticker symbol, e.g. NVDA, AAPL, BTC"),
});
