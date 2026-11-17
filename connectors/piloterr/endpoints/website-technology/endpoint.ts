import { defineEndpoint } from "@shared/core";
import { zPiloterrWebsiteTechnologyQueryParams } from "./schema/inputs.ts";

/**
 * GET /v2/website/technology — Detect the technologies a website runs.
 *
 * Billing: 1 Piloterr credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Piloterr Website Technology",
        summary: "Detect the technologies a website runs.",
        description:
            "Detect the technologies behind a website — CMS, frameworks, " +
            "analytics, CDN, payment and marketing tools — from its pages and " +
            "headers.",
        docsUrl: "https://docs.piloterr.com",
        categories: ["web-extraction"],
        notes: ["1 Piloterr credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v2/website/technology" },
    input: { schema: { queryParams: zPiloterrWebsiteTechnologyQueryParams } },
});
