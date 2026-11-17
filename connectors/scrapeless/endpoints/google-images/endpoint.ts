import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { googleBody } from "../../schema/google.ts";
import { zNativeOutput } from "../../schema/common.ts";
import { scraperPoll, scraperStart } from "../../protocol.ts";

export default defineEndpoint({
    endpoint: "/google/images",
    meta: {
        displayName: "Google Images",
        summary: "Search Google images with location and language controls.",
        description:
            "Provide input.q with optional locale and offset. Returns the full native response under provider_response; the 2026-10-22 live sample returned inline_images, while images_results is also retained when present. HTTP 201 is polled using the original taskId; HTTP 200 is validated as a final result. Empty result arrays are valid. num is not a hard count limit. No documented upstream cancellation.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/scraping-api/google-search/endpoints/",
        categories: ["web-search"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v1/scraper/request",
    },
    input: {
        schema: { body: googleBody("isch") },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? null, {
                input: utils.json.merge(
                    utils.json.optionalGet(
                        data.input.body ?? null,
                        "$.input",
                    ) ?? null,
                    { tbm: "isch" },
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
