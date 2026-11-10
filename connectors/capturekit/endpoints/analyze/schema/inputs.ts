import { z } from "zod";

/**
 * /v1/analyze query params — mirrors the vendor OpenAPI
 * (https://docs.capturekit.dev). Optionality only; strict, so an unknown key is rejected.
 */
export const zCapturekitAnalyzeQueryParams = z.strictObject({
    url: z.url({ protocol: /^https?$/ }).describe(
        "Public URL of the website.",
    ),
});
