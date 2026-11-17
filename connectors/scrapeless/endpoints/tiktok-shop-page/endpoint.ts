import { defineEndpoint } from "@shared/core";
import { commerceBody } from "../../schema/commerce.ts";
import { zNativeOutput } from "../../schema/common.ts";
import {
    commercePoll,
    commerceStart,
    zCommerceState,
} from "../../commerce-protocol.ts";

export default defineEndpoint({
    endpoint: "/tiktok/shop/page",
    meta: {
        displayName: "TikTok Shop Product",
        summary: "Retrieve a TikTok Shop product by product ID and region.",
        description:
            "Provide a current string product_id and its matching region, for example US. Returns the complete native product including available price, options, stock, seller and shipping fields under provider_response. This is Shop product data, not a TikTok account's posts. Submits once, polling the original taskId if pending. No documented cancellation. Product availability varies by target and region; a request can fail even when an earlier example worked.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/scraping-api/tiktok-scraper/endpoints/",
        categories: ["web-scraping"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v1/scraper/request",
    },
    input: { schema: { body: commerceBody("tiktok-shop-page") } },
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
