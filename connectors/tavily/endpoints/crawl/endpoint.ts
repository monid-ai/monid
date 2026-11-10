import { defineEndpoint } from "@shared/core";
import { tavilyUsageModel } from "../../provider.ts";
import { zTavilyCrawlBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Tavily Crawl",
        summary: "Explore a website and extract content from its pages.",
        description:
            "Crawl from a root URL and return page content as markdown " +
            "or text. Set a page limit and use instructions or path/domain " +
            "filters to focus the crawl. Supports basic or advanced " +
            "extraction and optional images. Use /map when you only need " +
            "URLs, or /extract when the URLs are already known.",
        docsUrl:
            "https://docs.tavily.com/documentation/api-reference/endpoint/crawl",
        categories: ["web-scraping"],
        notes: [
            "Credits include mapping plus extraction. Instructions increase mapping cost; advanced depth increases extraction cost.",
            "chunks_per_source applies when instructions are provided.",
        ],
    },
    request: { method: "POST", path: "/crawl" },
    timeouts: { requestMs: 160_000, runMs: 165_000 },
    input: {
        schema: {
            body: zTavilyCrawlBody.required({ limit: true }).extend({
                extract_depth: zTavilyCrawlBody.shape.extract_depth.unwrap()
                    .default("basic"),
            }),
        },
    },
    usage: {
        model: tavilyUsageModel,
        estimate: ({ data }) => ({
            counts: {
                CREDIT: Math.ceil(data.input.body.limit / 10) *
                        (data.input.body.instructions ? 2 : 1) +
                    Math.ceil(data.input.body.limit / 5) *
                        (data.input.body.extract_depth === "advanced" ? 2 : 1),
            },
        }),
    },
});
