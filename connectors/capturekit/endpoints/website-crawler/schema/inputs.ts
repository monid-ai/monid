import { z } from "zod";

/**
 * /v1/website/crawler query params — mirrors the vendor OpenAPI
 * (https://docs.capturekit.dev). Optionality only; strict, so an unknown key is rejected.
 */
export const zCapturekitWebsiteCrawlerQueryParams = z.strictObject({
    query: z.url({ protocol: /^https?$/ }).describe(
        "Public URL of the page.",
    ),
});
