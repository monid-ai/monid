import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "asOf": z.union([z.string(), z.null()]),
        "baseCurrency": z.string(),
        "count": z.number().int().min(0).max(9007199254740991),
        "totalDebt": z.union([
            z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
            z.null(),
        ]),
        "knownDebtSubtotal": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
        "totalMinPayment": z.union([
            z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
            z.null(),
        ]),
        "avgApr": z.union([z.number(), z.null()]),
        "aprKnownCount": z.number().int().min(0).max(9007199254740991),
        "totalYtdInterest": z.union([
            z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
            z.null(),
        ]),
        "ytdInterestKnownCount": z.number().int().min(0).max(9007199254740991),
        "debts": z.array(z.looseObject({
            "id": z.uuid(),
            "name": z.string(),
            "displayName": z.string(),
            "mask": z.union([z.string(), z.null()]),
            "balance": z.union([
                z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
                z.null(),
            ]),
            "balanceAsOf": z.union([z.string(), z.null()]),
            "balanceAsOfSource": z.union([
                z.enum(["institution", "fetched", "last_sync"]),
                z.null(),
            ]),
            "apr": z.union([z.number(), z.null()]),
            "minimumPayment": z.union([
                z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$")).describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
                z.null(),
            ]),
        })),
        "valuation": z.record(z.string(), z.json()),
        "unknownBalanceCount": z.number().int().min(0).max(9007199254740991),
    }),
});
