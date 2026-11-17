import { defineEndpoint } from "@shared/core";
import { zSearchBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/search",
    meta: {
        displayName: "Parallel Web Search",
        summary:
            "Search the web for ranked sources and focused excerpts, free without a key.",
        description:
            "Search the live web in Fast mode with a natural-language " +
            "objective and related keyword queries. Returns ranked URLs, titles " +
            "and excerpts. Use parallel#fetch when excerpts are insufficient " +
            "or you need a specific page's content.",
        categories: ["web-search"],
    },
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: {
            body: zSearchBody.extend({
                search_queries: zSearchBody.shape.search_queries.min(1),
            }),
        },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: {
                    name: "web_search",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
