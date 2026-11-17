import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "startDate": z.iso.date(),
    "endDate": z.iso.date(),
});
