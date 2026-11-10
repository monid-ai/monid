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
            consumes: { credit: "default", amount: 0.003 },
            description:
                "USD 3 per 1,000 requests at the original actor rate; authenticated existing /actors/pricing verified 2026-10-23. No inferred discounts.",
        },
    },
    endpoint: "/amazon/keywords",
    meta: {
        displayName: "amazon keywords",
        summary: "Retrieve amazon keywords data from Scrapeless.",
        description:
            "Provide the operation-specific inputs to retrieve amazon keywords data. Returns the complete native result under provider_response, including available metadata. Submits once, and pending tasks poll their original taskId without another submission. A representative real response is recorded. No documented upstream cancellation; result fields depend on the source page.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/scraping-api/amazon-scraper/endpoints/",
        categories: ["web-scraping"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v1/scraper/request",
    },
    input: { schema: { body: commerceBody("amazon-keywords") } },
    output: { schema: zNativeOutput },
    lifecycle: {
        start: commerceStart,
        poll: commercePoll,
        state: zCommerceState,
    },
    timeouts: { requestMs: 30000, runMs: 300000, pollMs: 2500 },
});
