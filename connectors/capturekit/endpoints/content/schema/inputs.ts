import { z } from "zod";

/**
 * /v1/content query params — mirrors the vendor OpenAPI
 * (https://docs.capturekit.dev). Optionality only; strict, so an unknown key is rejected.
 */
export const zCapturekitContentQueryParams = z.strictObject({
    url: z.url({ protocol: /^https?$/ }).describe(
        "Public URL of the page.",
    ),
    include_markdown: z.boolean().describe(
        "Include the page as Markdown.",
    ).optional(),
    use_defuddle: z.boolean().describe(
        "Keep the main content and drop navigation, footers and sidebars.",
    ).optional(),
});
