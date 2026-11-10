import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "baseCurrency": z.string(),
        "holdingCount": z.number().int().min(0).max(9007199254740991),
        "positions": z.array(z.looseObject({
            "accountId": z.union([z.string(), z.null()]),
            "chain": z.union([z.string(), z.null()]),
            "stockToken": z.union([z.record(z.string(), z.json()), z.null()]),
            "valuationKnown": z.boolean(),
            "priceKnown": z.boolean(),
            "instrumentId": z.union([z.string(), z.null()]),
            "symbol": z.union([z.string(), z.null()]),
            "name": z.union([z.string(), z.null()]),
            "type": z.union([z.string(), z.null()]),
            "quantity": z.number(),
            "price": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "value": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "currency": z.union([z.string(), z.null()]),
            "basisSource": z.union([z.string(), z.null()]),
            "returnPct": z.union([z.number(), z.null()]),
            "isManual": z.boolean(),
            "account": z.union([z.string(), z.null()]),
        })),
        "coverage": z.record(z.string(), z.json()),
        "analysis": z.record(z.string(), z.json()),
        "conversionIncomplete": z.boolean(),
        "page": z.record(z.string(), z.json()),
    }),
});
