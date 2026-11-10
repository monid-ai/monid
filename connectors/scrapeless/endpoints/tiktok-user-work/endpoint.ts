import { defineEndpoint } from "@shared/core";
import { commerceBody } from "../../schema/commerce.ts";
import { zNativeOutput } from "../../schema/common.ts";
import {
    commercePoll,
    commerceStart,
    zCommerceState,
} from "../../commerce-protocol.ts";

export default defineEndpoint({
    endpoint: "/tiktok/user/work",
    meta: {
        displayName: "TikTok User Posts",
        summary: "Retrieve a TikTok account's posts using its sec_uid.",
        description:
            "Provide sec_uid from User Detail, with optional string cursor and positive count. Returns one native items page and any supplier pagination fields unchanged under provider_response. A username is not a sec_uid. Each invocation returns one response; use supplier-provided continuation values when requesting another page. Submits once and polls the same taskId when pending; no documented cancellation.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/scraping-api/tiktok-scraper/endpoints/",
        categories: ["web-scraping"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v1/scraper/request",
    },
    input: { schema: { body: commerceBody("tiktok-user-work") } },
    output: { schema: zNativeOutput },
    lifecycle: {
        start: commerceStart,
        poll: commercePoll,
        state: zCommerceState,
    },
    usage: {
        model: {
            kind: "PER_CALL",
            label: "request",
            consumes: { credit: "default", amount: 0.003 },
            description:
                "USD 0.003 per request; project owner confirmed detail/work/Shop request-count billing on 2026-10-23. Not success-only supplier billing. Monid error runs settle at zero independently of upstream costs.",
        },
    },
    timeouts: { requestMs: 30_000, runMs: 300_000, pollMs: 2_500 },
});
