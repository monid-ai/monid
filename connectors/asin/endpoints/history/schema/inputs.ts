import { z } from "zod";

/**
 * /history query params — mirrors the vendor OpenAPI
 * (https://www.asin.dev/developers). Optionality only; strict, so an unknown key is rejected.
 */
export const zAsinHistoryQueryParams = z.strictObject({
    asin: z.string().regex(/^[A-Z0-9]{10}$/).describe(
        "10-character ASIN.",
    ),
    marketplace: z.enum(["com", "co.uk", "de", "fr", "it", "es", "ca", "co.jp"])
        .describe(
            "Amazon store, `com` for amazon.com.",
        ).optional(),
    days: z.number().int().min(1).describe(
        "History period in days.",
    ).optional(),
});
