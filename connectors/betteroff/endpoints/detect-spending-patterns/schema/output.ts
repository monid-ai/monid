import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.looseObject({
        "asOf": z.union([z.string(), z.null()]),
        "period": z.looseObject({
            "start": z.union([z.string(), z.null()]),
            "end": z.union([z.string(), z.null()]),
        }),
        "transactionCount": z.number().int().min(0).max(9007199254740991),
        "frequentMerchantPatterns": z.array(z.record(z.string(), z.json())),
        "monthlyTrend": z.array(z.record(z.string(), z.json())),
        "monthlyOutliers": z.array(z.record(z.string(), z.json())),
        "overallTrend": z.json(),
        "overallTrendBasis": z.record(z.string(), z.json()),
        "unusualTransactions": z.array(z.record(z.string(), z.json())),
    }),
});
