import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "summary": z.looseObject({
            "count": z.number().int().min(0).max(9007199254740991),
            "returnedCount": z.number().int().min(0).max(9007199254740991),
            "signConvention": z.literal("positive_is_outflow"),
            "netAmount": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "totalSpent": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "totalReceived": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "outflowCount": z.number().int().min(0).max(9007199254740991),
            "inflowCount": z.number().int().min(0).max(9007199254740991),
            "averageOutflow": z.union([
                z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
                z.null(),
            ]),
            "totalCurrency": z.string(),
            "unconvertedRowCount": z.number().int().min(0).max(
                9007199254740991,
            ),
            "truncated": z.boolean(),
        }),
        "transactions": z.array(z.looseObject({
            "id": z.uuid(),
            "name": z.union([z.string(), z.null()]),
            "amount": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    "Decimal text in the row's currency. Positive is an outflow; negative is an inflow.",
                ),
            "currency": z.union([z.string(), z.null()]),
            "date": z.string(),
        })),
        "period": z.looseObject({
            "start": z.union([z.string(), z.null()]),
            "end": z.union([z.string(), z.null()]),
        }),
        "page": z.record(z.string(), z.json()),
    }),
});
