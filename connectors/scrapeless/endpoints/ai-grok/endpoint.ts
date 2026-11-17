import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { aiBody } from "../../schema/ai.ts";
import { zNativeOutput } from "../../schema/common.ts";
import { scraperPoll, scraperStart } from "../../protocol.ts";

export default defineEndpoint({
    endpoint: "/ai/grok",
    usage: {
        model: {
            kind: "PER_CALL",
            consumes: { credit: "default", amount: 0.0018 },
            description:
                "Standard public USD 1.80 per 1,000 completed requests.",
        },
    },
    meta: {
        displayName: "Grok AI Scraper",
        summary: "Collect Grok answers and available source references.",
        description:
            "Provide this engine's input schema. Returns the complete native task_result under provider_response, including full_response; web_search_results, footnotes and x_search_results. Submits once and polls the original task_id. Results expire four minutes after completion according to the current guide; fetch promptly. No documented upstream cancellation. This engine does not expose the shopping input used by the other AI engines.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/ai-scraper/scrapers/grok/",
        categories: ["web-search"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v2/scraper/request",
    },
    input: { schema: { body: aiBody("grok") } },
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
