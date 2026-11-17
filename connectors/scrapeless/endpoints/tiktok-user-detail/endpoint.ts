import { defineEndpoint } from "@shared/core";
import { commerceBody } from "../../schema/commerce.ts";
import { zNativeOutput } from "../../schema/common.ts";
import {
    commercePoll,
    commerceStart,
    zCommerceState,
} from "../../commerce-protocol.ts";
export default defineEndpoint({
    usage: {
        model: {
            kind: "PER_CALL",
            label: "request",
            consumes: { credit: "default", amount: 0.003 },
            description:
                "USD 0.003 per request; project owner explicitly confirmed the same request-count rate for detail, work and Shop on 2026-10-23. Not success-only supplier billing. Monid error-run settlement remains a separate host behavior.",
        },
    },
    endpoint: "/tiktok/user/detail",
    meta: {
        displayName: "tiktok user detail",
        summary: "Retrieve tiktok user detail data from Scrapeless.",
        description:
            "Provide the operation-specific inputs to retrieve tiktok user detail data. Returns the complete native result under provider_response, including available metadata. Submits once, and pending tasks poll their original taskId without another submission. A representative real response is recorded. No documented upstream cancellation; result fields depend on the source page.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/scraping-api/tiktok-scraper/endpoints/",
        categories: ["web-scraping"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v1/scraper/request",
    },
    input: { schema: { body: commerceBody("tiktok-user-detail") } },
    output: { schema: zNativeOutput },
    lifecycle: {
        start: commerceStart,
        poll: commercePoll,
        state: zCommerceState,
    },
    timeouts: { requestMs: 30000, runMs: 300000, pollMs: 2500 },
});
