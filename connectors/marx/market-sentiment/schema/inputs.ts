import { z } from "npm:zod@3.22.4";

export const inputSchema = z.object({
  ticker: z.string().describe("Stock or crypto asset ticker symbol, e.g. NVDA, AAPL, BTC"),
});

export type Input = z.infer<typeof inputSchema>;
