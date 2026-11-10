import { defineEndpoint } from "@shared/core";
import { tavilyUsageModel } from "../../provider.ts";
import { zTavilyExtractBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Tavily Extract",
        summary:
            "Extract clean page content from one URL or a batch of up to 20.",
        description:
            "Retrieve markdown or plain text from known URLs, optionally " +
            "reranking content chunks for a query. Advanced extraction handles " +
            "more complex content. Returns successful extractions in results " +
            "and per-URL errors in failed_results. Start with /search to find " +
            "URLs, or use /crawl to explore a website.",
        docsUrl:
            "https://docs.tavily.com/documentation/api-reference/endpoint/extract",
        categories: ["web-scraping"],
        notes: [
            "Check both results and failed_results even on HTTP 200; failed URL extractions are not charged.",
            "chunks_per_source applies when query is provided.",
        ],
    },
    request: { method: "POST", path: "/extract" },
    timeouts: { requestMs: 70_000, runMs: 75_000 },
    input: {
        schema: {
            body: zTavilyExtractBody.extend({
                extract_depth: zTavilyExtractBody.shape.extract_depth.unwrap()
                    .default("basic"),
            }),
        },
    },
    usage: {
        model: tavilyUsageModel,
        estimate: ({ data }) => {
            const urls = data.input.body.urls;
            return {
                counts: {
                    CREDIT:
                        Math.ceil((Array.isArray(urls) ? urls.length : 1) / 5) *
                        (data.input.body.extract_depth === "advanced" ? 2 : 1),
                },
            };
        },
    },
});
