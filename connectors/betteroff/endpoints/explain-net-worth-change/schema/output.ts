import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "from": z.looseObject({
            "id": z.uuid(),
            "date": z.string(),
            "netWorth": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "totalAssets": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
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
        "to": z.looseObject({
            "id": z.uuid(),
            "date": z.string(),
            "netWorth": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
                    'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
                ),
            "totalAssets": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
                .describe(
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
        "baseCurrency": z.string(),
        "observedChange": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
        "assetChange": z.string().regex(new RegExp("^-?\\d+(\\.\\d+)?$"))
            .describe(
                'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
            ),
        "liabilityContribution": z.string().regex(
            new RegExp("^-?\\d+(\\.\\d+)?$"),
        ).describe(
            'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
        ),
        "reconciliationResidual": z.string().regex(
            new RegExp("^-?\\d+(\\.\\d+)?$"),
        ).describe(
            'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
        ),
        "economicAttributionResidual": z.string().regex(
            new RegExp("^-?\\d+(\\.\\d+)?$"),
        ).describe(
            'Decimal text, e.g. "-12.50". Read the currency beside it or on the result.',
        ),
        "accountCoverageChanged": z.boolean(),
        "warnings": z.array(z.string()),
    }),
});
