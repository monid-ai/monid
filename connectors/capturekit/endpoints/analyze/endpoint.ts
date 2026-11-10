import { defineEndpoint } from "@shared/core";
import { zCapturekitAnalyzeQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/analyze — AI analysis of a website: summary, value proposition, features, use cases.
 *
 * Billing: 1 CaptureKit credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "CaptureKit Website Analysis",
        summary:
            "AI analysis of a website: summary, value proposition, features, use cases.",
        description:
            "Read a public website and return an AI analysis of it: a " +
            "summary, the value proposition, features, categories and use " +
            "cases.",
        docsUrl: "https://docs.capturekit.dev",
        categories: ["web-extraction"],
        notes: [
            "1 CaptureKit credits per successful request. Errors are free.",
        ],
    },
    request: { method: "GET", path: "/v1/analyze" },
    input: { schema: { queryParams: zCapturekitAnalyzeQueryParams } },
});
