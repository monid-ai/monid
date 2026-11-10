import { defineEndpoint } from "@shared/core";
import { zPiloterrWebsiteCrawlerQueryParams } from "./schema/inputs.ts";

/**
 * GET /v2/website/crawler — Fetch a page's HTML over plain HTTP.
 *
 * Billing: 1 Piloterr credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Piloterr Website Crawler",
        summary: "Fetch a page's HTML over plain HTTP.",
        description:
            "Fetch the HTML of a public page over plain HTTP, without running " +
            "JavaScript — the cheapest way to read a static page. The " +
            "response is the page HTML as a JSON string. Use " +
            "`piloterr#v2/website/rendering` for pages that build their " +
            "content with JavaScript.",
        docsUrl: "https://docs.piloterr.com",
        categories: ["web-scraping"],
        notes: ["1 Piloterr credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v2/website/crawler" },
    input: { schema: { queryParams: zPiloterrWebsiteCrawlerQueryParams } },
});
