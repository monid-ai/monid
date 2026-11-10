import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "transactionIds": z.array(z.uuid()).min(1).max(10),
    "category": z.enum([
        "FOOD_AND_DRINK",
        "RENT_AND_UTILITIES",
        "ENTERTAINMENT",
        "GENERAL_MERCHANDISE",
        "GENERAL_SERVICES",
        "PEER_PAYMENTS",
        "TRANSPORTATION",
        "TRAVEL",
        "PERSONAL_CARE",
        "MEDICAL",
        "EDUCATION",
        "INSURANCE",
        "GIFTS_AND_DONATIONS",
        "PETS",
        "SUBSCRIPTIONS",
        "REAL_ESTATE",
        "INCOME",
        "LOAN_PAYMENTS",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "BANK_FEES",
        "GOVERNMENT_AND_NON_PROFIT",
        "HOME_IMPROVEMENT",
        "OTHER",
    ]),
});
