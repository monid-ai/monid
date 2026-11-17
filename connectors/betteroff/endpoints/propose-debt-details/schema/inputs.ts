import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "debtId": z.union([z.uuid(), z.null()]).describe(
        "The debt's id from betteroff_list_debts. Preferred over debtName.",
    ).optional(),
    "debtName": z.union([z.string().min(1).max(200), z.null()]).describe(
        "The debt's name as betteroff_list_debts returns it. Null when debtId is given.",
    ).optional(),
    "interestRate": z.union([z.number().min(0).max(100), z.null()]).describe(
        "APR as a percent, e.g. 24.99. Null to leave it unchanged.",
    ),
    "minimumPayment": z.union([z.number().min(0).max(1000000), z.null()])
        .describe("Minimum monthly payment. Null to leave it unchanged."),
    "nextPaymentDueDate": z.union([z.iso.date(), z.null()]).describe(
        "Next due date as YYYY-MM-DD. Null to leave it unchanged.",
    ),
});
