import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "period": z.enum(["7d", "30d", "90d", "all"]),
        "dataPoints": z.array(z.looseObject({
            "id": z.uuid(),
            "date": z.string(),
            "netWorth": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "currency": z.string(),
            "reconciliationStatus": z.string(),
        })),
        "change": z.union([
            z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
            z.null(),
        ]),
        "changePercent": z.union([z.number(), z.null()]).optional(),
        "asOf": z.union([z.string(), z.null()]).optional(),
        "baseDate": z.string().optional(),
        "baseNetWorth": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ).optional(),
        "baseCurrency": z.string().optional(),
        "currentNetWorth": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ).optional(),
        "totalAssets": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ).optional(),
        "totalLiabilities": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ).optional(),
    }),
});
