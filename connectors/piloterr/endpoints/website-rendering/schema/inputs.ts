import { z } from "zod";

/**
 * /v2/website/rendering query params — mirrors the vendor OpenAPI
 * (https://docs.piloterr.com). Optionality only; strict, so an unknown key is rejected.
 */
export const zPiloterrWebsiteRenderingQueryParams = z.strictObject({
    query: z.url({ protocol: /^https?$/ }).describe(
        "Public URL of the page, with `http://` or `https://`.",
    ),
    wait_in_seconds: z.number().int().min(0).max(30).describe(
        "Extra seconds to wait after the page loads.",
    ).optional(),
});
