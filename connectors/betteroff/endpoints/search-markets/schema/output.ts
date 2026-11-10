import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "markets": z.array(z.looseObject({
            "id": z.string(),
            "symbol": z.string(),
            "name": z.string(),
            "kind": z.enum(["fx", "perpetual", "spot", "prediction"]),
            "source": z.enum([
                "frankfurter",
                "hyperliquid-perps",
                "hyperliquid-spot",
                "polymarket",
                "polymarket-us",
                "kalshi",
                "pascal",
            ]),
            "price": z.union([z.number().min(0), z.null()]),
            "quoteCurrency": z.string(),
            "priceType": z.enum([
                "reference",
                "mark",
                "probability",
                "yes-ask",
                "yes-bid",
            ]),
            "asOf": z.union([z.string(), z.null()]),
            "observedAt": z.string(),
            "url": z.union([z.url(), z.null()]),
            "volume24hUsd": z.union([z.number().min(0), z.null()]).optional(),
        })),
        "coverage": z.array(z.looseObject({
            "source": z.enum([
                "frankfurter",
                "hyperliquid-perps",
                "hyperliquid-spot",
                "polymarket",
                "polymarket-us",
                "kalshi",
                "pascal",
            ]),
            "status": z.enum(["available", "partial", "unavailable"]),
            "observedAt": z.string(),
            "count": z.number().int().min(0).max(9007199254740991),
        })),
        "page": z.looseObject({
            "total": z.number().int().min(-9007199254740991).max(
                9007199254740991,
            ),
            "nextOffset": z.union([
                z.number().int().min(-9007199254740991).max(9007199254740991),
                z.null(),
            ]),
            "nextCursor": z.union([z.string(), z.null()]).optional(),
            "truncated": z.boolean(),
        }),
    }),
});
