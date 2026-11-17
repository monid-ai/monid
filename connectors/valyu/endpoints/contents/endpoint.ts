import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { dollarModel } from "../../usage.ts";
import { zValyuContentsBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Valyu Contents",
        summary: "Extract markdown, summaries, or structured data from URLs.",
        description: "Synchronously extract content from up to 10 HTTP/HTTPS " +
            "URLs. Request raw markdown, a summary, guided summarization, or " +
            "structured extraction with a JSON schema. Optionally capture " +
            "screenshots and choose extraction effort for JavaScript-heavy " +
            "pages. Per-URL status and failure reasons remain in the output.",
        docsUrl: "https://docs.valyu.ai/api-reference/endpoint/contents",
        categories: ["web-extraction"],
        notes: [
            "$0.001 per successfully extracted URL, plus $0.001 when " +
            "summary processing is enabled. Failed URLs are free; " +
            "total_cost_dollars is the authoritative receipt.",
            "Synchronous only: async: true and webhook_url are rejected. " +
            "HTTP 206 preserves partial successes; HTTP 422 means all " +
            "URLs failed and settles zero usage.",
        ],
    },
    request: { method: "POST", path: "/v1/contents" },
    input: {
        schema: {
            body: zValyuContentsBody.omit({ webhook_url: true }).extend({
                urls: zValyuContentsBody.shape.urls.max(10),
                async: z.literal(false).optional(),
            }).strict(),
        },
    },
    usage: {
        model: dollarModel,
        estimate: ({ data }) => {
            const urls = data.input.body.urls;
            const unique = urls.filter((url, index) =>
                urls.indexOf(url) === index
            );
            const summary = data.input.body.summary;
            const withSummary = summary !== undefined && summary !== false;
            return {
                counts: {
                    CREDIT: unique.length *
                        (withSummary ? 2_000_000 : 1_000_000),
                },
            };
        },
    },
});
