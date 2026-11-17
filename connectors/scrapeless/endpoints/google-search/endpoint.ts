import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { googleBody } from "../../schema/google.ts";
import { zNativeOutput } from "../../schema/common.ts";
import { scraperPoll, scraperStart } from "../../protocol.ts";

export default defineEndpoint({
    endpoint: "/google/search",
    meta: {
        displayName: "Google Web Search",
        summary:
            "Search Google web search with location and language controls.",
        description:
            "Provide input.q with optional locale and offset. Returns the full native response under provider_response, including organic_results when supplied by Google. HTTP 201 is polled using the original taskId; HTTP 200 is validated as a final result. Empty result arrays are valid. num is not a guaranteed count. No documented upstream cancellation.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/scraping-api/google-search/endpoints/",
        categories: ["web-search"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v1/scraper/request",
    },
    input: { schema: { body: googleBody() } },
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
