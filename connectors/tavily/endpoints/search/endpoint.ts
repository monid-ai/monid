import { defineEndpoint } from "@shared/core";
import { tavilyUsageModel } from "../../provider.ts";
import { zTavilySearchBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Tavily Search",
        summary:
            "Search the web with ranked results and optional answers and page content.",
        description:
            "Find relevant web sources with content snippets, relevance " +
            "scores and source URLs. Supports general, news and finance search, " +
            "domain/date/language filters, four search depths, optional answers " +
            "and raw content. Use /extract when you already know the URLs.",
        docsUrl:
            "https://docs.tavily.com/documentation/api-reference/endpoint/search",
        categories: ["web-search", "news-search"],
        notes: [
            "auto_parameters may choose advanced depth (2 credits) when search_depth is omitted. An explicit depth overrides automatic selection.",
            "country is supported for topic=general. include_domains_mode requires include_domains; filter_by_language requires language.",
            "safe_search is not supported with fast or ultra-fast. include_image_descriptions requires include_images.",
        ],
    },
    request: { method: "POST", path: "/search" },
    input: {
        schema: {
            body: zTavilySearchBody.extend({
                max_results: zTavilySearchBody.shape.max_results.unwrap()
                    .default(10),
                auto_parameters: zTavilySearchBody.shape.auto_parameters
                    .unwrap().default(false),
            }),
        },
    },
    usage: {
        model: tavilyUsageModel,
        estimate: ({ data }) => ({
            counts: {
                CREDIT: data.input.body.search_depth === "advanced" ||
                        (data.input.body.search_depth === undefined &&
                            data.input.body.auto_parameters)
                    ? 2
                    : 1,
            },
        }),
    },
});
