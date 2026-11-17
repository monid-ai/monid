import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWebSearchBody } from "./schema/inputs.ts";

/**
 * Mindcase `web/search`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Web Search",
        summary: "Search the web for AI agents: ranked results with a " +
            "page-text excerpt for each one, the published date when the " +
            "page has one, and the domain. One result set...",
        description: "Search the web for AI agents: ranked results with a " +
            "page-text excerpt for each one, the published date when the " +
            "page has one, and the domain. One result set per query, " +
            "ready to drop into a prompt. Returns one row per result with " +
            "query, position, title, url, domain, excerpt, publishedDate, " +
            "engine, fetchedAt. For Google's own ranking use " +
            "mindcase#google/search; for the full text of a result use " +
            "mindcase#web/scrape. $0.001 per result; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/web/search",
        categories: ["web-search"],
        notes: [
            "`maxResults` caps rows per input, so a run can return up to " +
            "that many rows for each `query` entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/web/search",
    request: { method: "POST", path: "/v1/data/web/search/run" },
    input: {
        schema: {
            body: zWebSearchBody.extend({
                maxResults: zWebSearchBody.shape.maxResults.unwrap().min(1)
                    .default(10).describe(
                        "How many results to return for each query, up to 20.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.query.length;
            const rows = body.maxResults * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
