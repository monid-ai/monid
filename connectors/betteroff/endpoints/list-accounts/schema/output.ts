import { z } from "zod";
import { zCurrentResult } from "../../../schema/output.ts";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = zCurrentResult.extend({
    data: z.array(z.looseObject({
        "id": z.uuid(),
        "displayName": z.union([z.string(), z.null()]),
        "name": z.union([z.string(), z.null()]),
        "type": z.string(),
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
        "currency": z.union([z.string(), z.null()]),
        "isHidden": z.union([z.boolean(), z.null()]),
    })),
});
