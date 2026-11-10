import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "period": z.looseObject({
            "start": z.union([z.string(), z.null()]),
            "end": z.union([z.string(), z.null()]),
        }),
        "totalSpending": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
        "groupCount": z.number().int().min(0).max(9007199254740991),
        "categories": z.array(z.looseObject({
            "category": z.string(),
            "categoryCode": z.union([z.string(), z.null()]),
            "merchant": z.union([z.string(), z.null()]).optional(),
            "amount": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "count": z.number().int().min(0).max(9007199254740991),
            "percentage": z.number(),
        })),
        "comparison": z.record(z.string(), z.json()).optional(),
    }),
});
