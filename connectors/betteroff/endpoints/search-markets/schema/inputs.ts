import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "query": z.string().max(120),
    "kind": z.union([
        z.enum(["fx", "perpetual", "spot", "prediction"]),
        z.null(),
    ]),
    "source": z.union([
        z.enum([
            "frankfurter",
            "hyperliquid-perps",
            "hyperliquid-spot",
            "polymarket",
            "polymarket-us",
            "kalshi",
            "pascal",
        ]),
        z.null(),
    ]),
    "limit": z.number().int().min(1).max(50),
    "offset": z.number().int().min(0).max(50000),
    "cursor": z.union([z.string().max(2000), z.null()]).optional(),
});
