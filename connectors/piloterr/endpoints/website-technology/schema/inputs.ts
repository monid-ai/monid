import { z } from "zod";

/**
 * /v2/website/technology query params — mirrors the vendor OpenAPI
 * (https://docs.piloterr.com). Optionality only; strict, so an unknown key is rejected.
 */
export const zPiloterrWebsiteTechnologyQueryParams = z.strictObject({
    query: z.string().min(1).describe(
        "The website domain or URL, for example `example.com`.",
    ),
});
