import { defineEndpoint } from "@shared/core";
import { zGetMakerBody } from "./schema/inputs.ts";

/** get_maker — `tools/call` on Loyaltie's MCP server. */
export default defineEndpoint({
    meta: {
        displayName: "Loyaltie Get Brand",
        summary:
            "The independent brand behind a product: story, city and state, ratings and its products.",
        description: "The independent US brand behind a Loyaltie " +
            "product, by seller.id or store link: who they are and their " +
            "story, city and state, ratings, policies and a list of their " +
            "products. Use it when the person asks who makes something or " +
            "wants to buy more from the same brand. Free.",
        docsUrl: "https://loyaltie.com/skill.md",
        categories: ["shopping"],
    },
    endpoint: "/get-maker",
    request: { method: "POST", path: "/api/ucp/mcp" },
    input: {
        schema: { body: zGetMakerBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "get_maker",
                    arguments: {
                        ...(data.input.body as Record<string, never>),
                        src: "api",
                        agent_id: "monid",
                    },
                },
            },
        }),
    },
});
