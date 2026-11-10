import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "symbol": z.union([
        z.string().describe(
            "Filter by ticker symbol (e.g. AAPL, BTC, ETH). Use null for all symbols.",
        ),
        z.null().describe(
            "Filter by ticker symbol (e.g. AAPL, BTC, ETH). Use null for all symbols.",
        ),
    ]).describe(
        "Filter by ticker symbol (e.g. AAPL, BTC, ETH). Use null for all symbols.",
    ),
    "instrumentId": z.union([
        z.string().describe(
            "Filter by canonical instrument ID. Preferred over symbol when available. Use null for all.",
        ),
        z.null().describe(
            "Filter by canonical instrument ID. Preferred over symbol when available. Use null for all.",
        ),
    ]).describe(
        "Filter by canonical instrument ID. Preferred over symbol when available. Use null for all.",
    ),
    "type": z.union([
        z.string().describe(
            "Filter by holding type (equity, etf, mutual_fund, crypto). Use null for all types.",
        ),
        z.null().describe(
            "Filter by holding type (equity, etf, mutual_fund, crypto). Use null for all types.",
        ),
    ]).describe(
        "Filter by holding type (equity, etf, mutual_fund, crypto). Use null for all types.",
    ),
    "groupBy": z.enum(["type", "account", "symbol", "instrument", "underlying"])
        .describe(
            "Group by type, account, symbol, separate instrument, or underlying ISIN exposure across brokerage holdings and Stock Tokens.",
        ),
    "includePositions": z.boolean(),
    "cursor": z.union([
        z.strictObject({
            "offset": z.number().int().min(0).max(9007199254740991),
            "revision": z.number().int().min(-9007199254740991).max(
                9007199254740991,
            ),
        }),
        z.null(),
    ]).optional(),
    "limit": z.union([z.number().int().min(1).max(50), z.null()]),
});
