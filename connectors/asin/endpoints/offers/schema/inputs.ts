import { z } from "zod";

/**
 * /offers query params — mirrors the vendor OpenAPI
 * (https://www.asin.dev/developers). Optionality only; strict, so an unknown key is rejected.
 */
export const zAsinOffersQueryParams = z.strictObject({
    asin: z.string().regex(/^[A-Z0-9]{10}$/).describe(
        "10-character ASIN.",
    ),
    marketplace: z.enum(["com", "co.uk", "de", "fr", "it", "es", "ca", "co.jp"])
        .describe(
            "Amazon store, `com` for amazon.com.",
        ).optional(),
});
