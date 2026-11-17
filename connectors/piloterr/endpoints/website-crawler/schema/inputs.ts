import { z } from "zod";

/**
 * /v2/website/crawler query params — mirrors the vendor OpenAPI
 * (https://docs.piloterr.com). Optionality only; strict, so an unknown key is rejected.
 */
export const zPiloterrWebsiteCrawlerQueryParams = z.strictObject({
    query: z.url({ protocol: /^https?$/ }).describe(
        "Public URL of the page, with `http://` or `https://`.",
    ),
});
