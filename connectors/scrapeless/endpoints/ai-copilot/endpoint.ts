import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { aiBody } from "../../schema/ai.ts";
import { zNativeOutput } from "../../schema/common.ts";
import { scraperPoll, scraperStart } from "../../protocol.ts";

export default defineEndpoint({
    endpoint: "/ai/copilot",
    meta: {
        displayName: "Microsoft Copilot AI Scraper",
        summary: "Collect Microsoft Copilot answers and available citations.",
        description:
            "Provide prompt, country and a documented mode: search, smart, chat, reasoning or study; optionally request a share link. Returns native task_result including result_text, links and citations under provider_response. Submits once and polls the original task_id. Fetch promptly: documented result retention is four minutes after completion. No documented cancellation. The current official search example has a recorded live success; other modes are not all independently live-tested.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/ai-scraper/scrapers/copilot/",
        categories: ["web-search"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v2/scraper/request",
    },
    input: { schema: { body: aiBody("copilot") } },
    output: { schema: zNativeOutput },
    usage: {
        model: {
            kind: "PER_CALL",
            consumes: { credit: "default", amount: 0.002 },
            description:
                "Original actor price USD 2 per 1,000 requests, verified against the existing actor price table on 2026-10-23. Internal polling is not a second business submission.",
        },
    },
    lifecycle: {
        start: scraperStart,
        poll: scraperPoll,
        state: z.strictObject({
            consecutive_errors: z.number().int().nonnegative(),
        }),
    },
    timeouts: { requestMs: 30_000, runMs: 300_000, pollMs: 2_500 },
});
