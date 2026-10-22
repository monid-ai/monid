import { z } from "zod";

/** `GET /api/v1/regions` query — vendor mirror (D25). */
export const zRegionsQueryParams = z.strictObject({
    country: z.string().max(8).describe(
        "One of us, ca, uk, au. The vendor defaults to us.",
    ).optional(),
});
