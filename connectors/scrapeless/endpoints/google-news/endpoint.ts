import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { googleBody } from "../../schema/google.ts";
import { zNativeOutput } from "../../schema/common.ts";
import { scraperPoll, scraperStart } from "../../protocol.ts";

export default defineEndpoint({
    endpoint: "/google/news",
    meta: {
        displayName: "Google News",
        summary:
            "Google News via Scrapeless; native results and bounded task polling.",
        description:
            "Provide input.q with optional location, language and result offset. Searches Google News with fixed tbm=nws and returns the complete native response under provider_response, including available news results and metadata. HTTP 200 is validated as a final result; pending HTTP 201 tasks are polled using the original taskId without another submission. Uses the declared Google Search rate; internal polling adds no separate business charge. Retrieve pending results promptly; no upstream cancellation is exposed by this binding.",
        docsUrl: "https://github.com/scrapeless-ai/google-scraper",
        categories: ["news-search"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v1/scraper/request",
    },
    input: {
        schema: { body: googleBody("nws") },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? null, {
                input: utils.json.merge(
                    utils.json.optionalGet(
                        data.input.body ?? null,
                        "$.input",
                    ) ?? null,
                    { tbm: "nws" },
                ),
            }),
        }),
    },
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
