import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "venue": z.enum(["upshift", "morpho", "ethena"]).optional(),
    "asset": z.string().max(20).describe("Asset symbol such as USDC.")
        .optional(),
});
