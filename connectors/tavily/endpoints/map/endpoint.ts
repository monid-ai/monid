import { defineEndpoint } from "@shared/core";
import { tavilyUsageModel } from "../../provider.ts";
import { zTavilyMapBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Tavily Map",
        summary:
            "Discover a website's URLs with traversal and path/domain filters.",
        description:
            "Explore a website and return its discovered URLs. Set a " +
            "page limit and optionally restrict paths, domains, depth or " +
            "breadth. Natural-language instructions focus discovery. Use " +
            "/crawl for page content or /extract for selected URLs.",
        docsUrl:
            "https://docs.tavily.com/documentation/api-reference/endpoint/map",
        categories: ["web-scraping"],
    },
    request: { method: "POST", path: "/map" },
    timeouts: { requestMs: 160_000, runMs: 165_000 },
    input: { schema: { body: zTavilyMapBody.required({ limit: true }) } },
    usage: {
        model: tavilyUsageModel,
        estimate: ({ data }) => ({
            counts: {
                CREDIT: Math.ceil(data.input.body.limit / 10) *
                    (data.input.body.instructions ? 2 : 1),
            },
        }),
    },
});
