import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "baseCurrency": z.string(),
        "feasible": z.boolean(),
        "totalMonths": z.union([z.number(), z.null()]),
        "totalInterest": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
        "order": z.array(z.looseObject({
            "id": z.string(),
            "name": z.string(),
            "payoffMonth": z.number(),
        })),
    }),
});
