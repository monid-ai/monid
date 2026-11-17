import { Unit, UsageModelKind } from "@shared/core";

// Currency conversion, not a fixed retrieval price. Whole nanodollars
// avoid the engine rounding fractional-dollar quantities up to $1.
export const dollarModel = {
    kind: UsageModelKind.PER_UNIT,
    unit: Unit.CREDIT,
    label: "nanodollars",
    description: "Vendor-reported USD cost in billionths of a dollar",
    consumes: { credit: "default", amount: 0.000000001 },
} as const;
