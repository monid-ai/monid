import { z } from "zod";

/**
 * /search query params — mirrors the vendor OpenAPI
 * (https://www.asin.dev/developers). Optionality only; strict, so an unknown key is rejected.
 */
export const zAsinSearchQueryParams = z.strictObject({
    query: z.string().min(1).describe(
        "Search keywords.",
    ),
    marketplace: z.enum(["com", "co.uk", "de", "fr", "it", "es", "ca", "co.jp"])
        .describe(
            "Amazon store, `com` for amazon.com.",
        ).optional(),
});
