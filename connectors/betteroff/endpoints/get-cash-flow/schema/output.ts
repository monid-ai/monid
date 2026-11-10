import { z } from "zod";
import { zMoney, zReadResult } from "../../../schema/output.ts";

export const zOutput = zReadResult.extend({
    data: z.looseObject({
        baseCurrency: z.string(),
        period: z.looseObject({
            start: z.string().nullable(),
            end: z.string().nullable(),
        }),
        income: zMoney,
        expenses: zMoney,
        netCashFlow: zMoney,
        transactionCount: z.number().int().nonnegative(),
        savingsRatePercent: z.number().nullable(),
        dailyRates: z.looseObject({ income: zMoney, expenses: zMoney }),
        projection: z.looseObject({
            projectedIncome: zMoney,
            projectedExpenses: zMoney,
            projectedNet: zMoney,
        }).nullable(),
        priorPeriod: z.looseObject({
            start: z.string(),
            end: z.string(),
            income: zMoney,
            expenses: zMoney,
            netCashFlow: zMoney,
            savingsRatePercent: z.number().nullable(),
        }),
    }),
});
