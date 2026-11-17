import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "includeTaxReviews": z.boolean().optional(),
});
