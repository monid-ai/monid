import { z } from "zod";
import { zMoney, zReadResult } from "../../../schema/output.ts";

export const zOutput = zReadResult.extend({
    data: z.looseObject({
        asOf: z.string().nullable(),
        count: z.number().int().nonnegative(),
        counts: z.looseObject({
            active: z.number().int().nonnegative(),
            activeCharges: z.number().int().nonnegative(),
            activeIncoming: z.number().int().nonnegative(),
            inactive: z.number().int().nonnegative(),
            inactiveCharges: z.number().int().nonnegative(),
            inactiveIncoming: z.number().int().nonnegative(),
            unknownStatus: z.number().int().nonnegative(),
        }),
        items: z.array(z.looseObject({
            streamId: z.string(),
            direction: z.string(),
            merchant: z.string().nullable(),
            amount: zMoney.nullable(),
            averageAmount: zMoney.nullable(),
            currency: z.string().nullable(),
            frequency: z.string().nullable(),
            lastDate: z.string().nullable(),
            nextDate: z.string().nullable(),
            plaidCategory: z.string().nullable(),
            status: z.string().nullable(),
            isActive: z.boolean().nullable(),
            stale: z.boolean(),
            source: z.literal("plaid"),
        })),
    }),
});
