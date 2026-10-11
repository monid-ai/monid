import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zFetchBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/fetch",
    meta: {
        displayName: "Parallel Web Fetch",
        summary:
            "Extract focused excerpts or full markdown from up to 20 URLs, free without a key.",
        description:
            "Fetch specific HTTP/HTTPS pages and return focused excerpts " +
            "with source URLs, plus per-URL errors. Supply an objective and " +
            "optional search queries to focus extraction. Request full_content " +
            "only when you need complete markdown; responses can be large.",
        categories: ["web-scraping"],
    },
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: {
            body: zFetchBody.extend({
                urls: z.array(
                    z.url({ protocol: /^https?$/ }).regex(/^https?:\/\//),
                ).min(1).max(20),
                objective: zFetchBody.shape.objective.unwrap().unwrap().max(200)
                    .nullable().optional(),
            }),
        },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: { name: "web_fetch", arguments: data.input.body ?? {} },
            },
        }),
    },
});
