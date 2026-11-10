import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "accountType": z.union([
        z.enum([
            "depository",
            "investment",
            "credit",
            "loan",
            "crypto",
            "wallet",
        ]),
        z.null(),
    ]).describe("Filter by account type. Omit or use null to get all accounts.")
        .optional(),
});
