import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { aiBody } from "../../schema/ai.ts";
import { zNativeOutput } from "../../schema/common.ts";
import { scraperPoll, scraperStart } from "../../protocol.ts";

export default defineEndpoint({
    endpoint: "/ai/perplexity",
    usage: {
        model: {
            kind: "PER_CALL",
            consumes: { credit: "default", amount: 0.0018 },
            description:
                "Standard public USD 1.80 per 1,000 completed requests.",
        },
    },
    meta: {
        displayName: "Perplexity AI Scraper",
        summary: "Collect Perplexity answers and available source references.",
        description:
            "Provide prompt and country to collect Perplexity answers, web_results and media_items. Native task_result and references are retained under provider_response. Submits once and polls the original task_id. Retrieve promptly: results expire four minutes after completion. No documented upstream cancellation.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/ai-scraper/scrapers/perplexity/",
        categories: ["web-search"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v2/scraper/request",
    },
    input: { schema: { body: aiBody("perplexity") } },
    output: { schema: zNativeOutput },
    timeouts: { requestMs: 30_000, runMs: 300_000, pollMs: 2_500 },
    lifecycle: {
        start: scraperStart,
        poll: scraperPoll,
        state: z.strictObject({
            consecutive_errors: z.number().int().nonnegative(),
        }),
    },
});
