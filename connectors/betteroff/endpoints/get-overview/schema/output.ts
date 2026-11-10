import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "identity": z.looseObject({
            "login": z.union([z.string(), z.null()]),
            "name": z.union([z.string(), z.null()]),
            "household": z.union([z.string(), z.null()]),
        }),
        "valuation": z.union([
            z.looseObject({
                "id": z.uuid(),
                "date": z.string(),
                "netWorth": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                    .describe(
                        'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                    ),
                "totalAssets": z.string().regex(
                    new RegExp("^-?\\d+(\\.\\d+)?$"),
                ).describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
                "totalLiabilities": z.string().regex(
                    new RegExp("^-?\\d+(\\.\\d+)?$"),
                ).describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
                "baseCurrency": z.string(),
                "methodologyVersion": z.string(),
                "reconciliationStatus": z.enum([
                    "reconciled",
                    "incomplete",
                    "discrepancy",
                ]),
                "accountCount": z.union([
                    z.number().int().min(0).max(9007199254740991),
                    z.null(),
                ]),
            }),
            z.null(),
        ]),
        "coverage": z.looseObject({
            "accountCount": z.number().int().min(0).max(9007199254740991),
            "unknownBalanceCount": z.number().int().min(0).max(
                9007199254740991,
            ),
            "unknownFreshnessCount": z.number().int().min(0).max(
                9007199254740991,
            ),
        }),
        "ledger": z.union([
            z.looseObject({
                "engineVersion": z.string(),
                "publishedAt": z.iso.datetime(),
                "reviewItemCount": z.number().int().min(0).max(
                    9007199254740991,
                ),
                "reviewCauses": z.array(z.string()),
                "transactionsWithoutEvidence": z.number().int().min(0).max(
                    9007199254740991,
                ),
                "reconciliationBreakCount": z.union([
                    z.number().int().min(0).max(9007199254740991),
                    z.null(),
                ]),
                "latestRunFailed": z.boolean(),
            }),
            z.null(),
        ]),
    }),
});
