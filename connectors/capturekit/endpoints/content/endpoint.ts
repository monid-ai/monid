import { defineEndpoint } from "@shared/core";
import { zCapturekitContentQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/content — Get a page as Markdown with its metadata and links.
 *
 * Billing: 1 CaptureKit credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "CaptureKit Page Content",
        summary: "Get a page as Markdown with its metadata and links.",
        description:
            "Render a public page and return its content: `markdown` (set " +
            "`include_markdown`), the page `metadata` (title, description, " +
            "Open Graph image) and its internal, external and social `links`. " +
            "Set `use_defuddle` to keep only the main content.",
        docsUrl: "https://docs.capturekit.dev",
        categories: ["web-scraping"],
        notes: [
            "1 CaptureKit credits per successful request. Errors are free.",
        ],
    },
    request: { method: "GET", path: "/v1/content" },
    input: { schema: { queryParams: zCapturekitContentQueryParams } },
});
