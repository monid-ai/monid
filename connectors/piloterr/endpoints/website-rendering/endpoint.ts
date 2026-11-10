import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPiloterrWebsiteRenderingQueryParams } from "./schema/inputs.ts";

/**
 * GET /v2/website/rendering — Fetch a page's HTML after a headless browser runs its JavaScript.
 *
 * Billing: 2 Piloterr credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Piloterr Website Rendering",
        summary:
            "Fetch a page's HTML after a headless browser runs its JavaScript.",
        description:
            "Load a public page in a headless browser, let its JavaScript " +
            "run, and return the rendered HTML as a JSON string. Use it for " +
            "single-page apps and listings that render in the browser; " +
            "`wait_in_seconds` gives slow pages more time.",
        docsUrl: "https://docs.piloterr.com",
        categories: ["web-scraping"],
        notes: ["2 Piloterr credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v2/website/rendering" },
    input: { schema: { queryParams: zPiloterrWebsiteRenderingQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
