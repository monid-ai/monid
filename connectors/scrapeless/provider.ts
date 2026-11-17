import { defineProvider, presets } from "@shared/core";

/** Public rates plus explicitly confirmed TikTok rates; account billing stays upstream. */
export default defineProvider({
    name: "scrapeless",
    meta: {
        displayName: "Scrapeless",
        summary:
            "Search Google, collect AI answers, unlock pages and extract commerce data.",
        description:
            "Search Google, collect AI answers, unlock pages, retrieve Amazon data, and query TikTok profiles, posts and Shop products. Native fields, citations and task identifiers are retained. Actor USD rates are pinned; account discounts and platform retail pricing are outside this connector.",
        homepageUrl: "https://www.scrapeless.com",
        docsUrl: "https://docs.scrapeless.com/en/docs/get-started/overview/",
        categories: ["web-search", "web-scraping"],
        notes: [
            "Review batch: Google Search API, AI Scraper, Web Unlocker, Amazon and TikTok (22 endpoints).",
            "TikTok user detail, user work and Shop are USD 0.003 per request, confirmed by the project owner on 2026-10-23; this is not a success-only supplier rate. Monid currently zero-settles error runs; that host behavior is not proof of zero supplier cost or an override of upstream billing.",
            "Local request/run budgets are development policy, not confirmed production limits.",
            "Outputs retain the complete native payload under provider_response. An absent usage field is unknown, not zero.",
        ],
    },
    auth: { inject: presets.auth.header("x-api-token") },
    // Business endpoints explicitly select their API origin; authentication
    // remains restricted to the origin of each declared request.
    request: { baseUrl: "https://backend.scrapeless.com" },
    usage: {
        credits: { default: { label: "US dollars" } },
        model: {
            kind: "PER_CALL",
            label: "completed request",
            description:
                "Standard list price: USD 1 per 1,000 completed Google or Unlocker requests. Polling within a run does not add charges.",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
    timeouts: { requestMs: 30_000, runMs: 300_000 },
    output: {
        fromError: ({ data, utils }) => {
            const raw =
                utils.json.optionalGet(data.output, "$.provider_response") ??
                    data.output;
            const message =
                utils.json.optionalGet(data.output, "$.connector_error") ??
                    utils.json.optionalGet(raw, "$.message") ??
                    utils.json.optionalGet(raw, "$.error");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Scrapeless request failed",
                task_id: utils.json.optionalGet(data.output, "$.task_id") ??
                    null,
                provider_status: utils.json.optionalGet(raw, "$.status") ??
                    null,
                provider_http_status: utils.json.optionalGet(
                    data.output,
                    "$.provider_http_status",
                ) ?? null,
                code: utils.json.optionalGet(raw, "$.code") ?? null,
                trace_id: utils.json.optionalGet(raw, "$.traceId") ?? null,
                submission_uncertain:
                    utils.json.optionalGet(raw, "$.submission_uncertain") ===
                        true,
                raw,
            };
        },
    },
});
