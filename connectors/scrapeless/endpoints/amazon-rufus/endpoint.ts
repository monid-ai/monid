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
    endpoint: "/amazon/rufus",
    meta: {
        displayName: "Amazon Rufus",
        summary:
            "Ask Amazon Rufus shopping questions, optionally about one ASIN.",
        description:
            "Provide keywords and a full Amazon domain, optionally asin to scope the answer to one product. Returns the native answer, grouped products, follow-up questions and available metadata under provider_response. is_get_question=true adds per-product products[].related_questions in the recorded comparison; top-level result.related_questions also occurs when false. is_sse_data=true was verified to return event records in JSON html, not a live event-stream transport. Independent with/without-ASIN and flag samples are recorded. Resend ASIN on each independent call; no persistent conversation handle is exposed. Submits once and polls the original taskId if pending. No documented upstream cancellation; returned fields vary by question.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/scraping-api/amazon-scraper/endpoints/",
        categories: ["web-scraping"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v1/scraper/request",
    },
    input: { schema: { body: commerceBody("amazon-rufus") } },
    output: { schema: zNativeOutput },
    lifecycle: {
        start: commerceStart,
        poll: commercePoll,
        state: zCommerceState,
    },
    timeouts: { requestMs: 30000, runMs: 300000, pollMs: 2500 },
});
