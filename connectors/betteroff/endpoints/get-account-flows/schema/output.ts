import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "period": z.looseObject({
            "start": z.union([z.string(), z.null()]),
            "end": z.union([z.string(), z.null()]),
        }),
        "filters": z.record(z.string(), z.json()),
        "summary": z.looseObject({
            "currency": z.string(),
            "deposited": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "withdrawn": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "net": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
            "depositCount": z.number().int().min(0).max(9007199254740991),
            "withdrawalCount": z.number().int().min(0).max(9007199254740991),
            "matchingCount": z.number().int().min(0).max(9007199254740991),
        }),
        "accounts": z.array(z.looseObject({
            "id": z.uuid(),
            "name": z.union([z.string(), z.null()]),
            "officialName": z.union([z.string(), z.null()]),
            "type": z.string(),
            "subtype": z.union([z.string(), z.null()]),
            "mask": z.union([z.string(), z.null()]),
            "institution": z.union([z.string(), z.null()]),
            "currency": z.string(),
            "deposited": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "withdrawn": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "net": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                "Deposited minus withdrawn, in currency. Negative is a net outflow.",
            ),
            "depositCount": z.number().int().min(0).max(9007199254740991),
            "withdrawalCount": z.number().int().min(0).max(9007199254740991),
            "connectionHealth": z.union([
                z.record(z.string(), z.json()),
                z.null(),
            ]),
        })),
        "transactions": z.array(z.looseObject({
            "id": z.uuid(),
            "name": z.union([z.string(), z.null()]),
            "amount": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    "Decimal text in the row's currency. Positive is an outflow; negative is an inflow.",
                ),
            "absoluteAmount": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "currency": z.string(),
            "date": z.string(),
            "direction": z.enum(["inflow", "outflow"]),
            "flowLabel": z.enum(["deposit", "withdrawal"]),
            "transactionType": z.string(),
            "transactionClass": z.union([z.string(), z.null()]),
            "category": z.union([z.string(), z.null()]),
            "subcategory": z.union([z.string(), z.null()]),
            "status": z.string(),
            "account": z.string(),
        })),
    }),
});
