import { defineEndpoint } from "@shared/core";
import { zCapturekitWebsiteCrawlerQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/website/crawler — Fetch a page's raw HTML without rendering.
 *
 * Billing: 1 CaptureKit credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "CaptureKit Website Crawler",
        summary: "Fetch a page's raw HTML without rendering.",
        description:
            "Fetch the raw HTML of a public page over plain HTTP, without a " +
            "browser — fast and cheap for static pages.",
        docsUrl: "https://docs.capturekit.dev",
        categories: ["web-scraping"],
        notes: [
            "1 CaptureKit credits per successful request. Errors are free.",
        ],
    },
    request: { method: "GET", path: "/v1/website/crawler" },
    input: { schema: { queryParams: zCapturekitWebsiteCrawlerQueryParams } },
});
