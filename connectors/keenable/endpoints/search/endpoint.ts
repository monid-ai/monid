import { defineEndpoint } from "@shared/core";
import { zKeenableSearchBody } from "./schema/inputs.ts";

/**
 * POST /v1/search — ranked web results with extracted snippets.
 *
 * Usage falls back to the provider's PER_CALL 1 credit; estimate and
 * evidence are compiler-synthesized (flat model).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Search",
        summary: "Search the web and get ranked results with page snippets.",
        description: "Search Keenable's web index and return ranked " +
            "results with title, URL, description, and an extracted " +
            "snippet of page text. Restrict to a site, filter by " +
            "publication date or when the page was indexed, search the " +
            "index as it stood at a point in time (`query_time`), cap " +
            "snippet length (180–10000 characters) and result count " +
            "(1–50, default 10). Phrase the query as a description of " +
            "the page you want. Pipe result URLs into Keenable /fetch " +
            "when you need the full page as markdown.",
        docsUrl: "https://docs.keenable.ai/api-reference/search",
        categories: ["web-search"],
        notes: [
            "Search mode (realtime vs pro) is decided per call by " +
            "Keenable, not a request parameter. The REST body does not " +
            "accept `mode`; a response may echo the mode that was " +
            "served. MCP integrators can pin it via " +
            '`_meta["keenable/overrides"]`, which this connector ' +
            "does not expose.",
        ],
    },
    request: { method: "POST", path: "/v1/search" },
    input: {
        schema: {
            body: zKeenableSearchBody.extend({
                query: zKeenableSearchBody.shape.query.min(1),
                site: zKeenableSearchBody.shape.site.unwrap().min(1)
                    .optional(),
                snippet_max_length: zKeenableSearchBody.shape
                    .snippet_max_length.unwrap().min(180).max(10000)
                    .optional(),
                max_results: zKeenableSearchBody.shape.max_results
                    .unwrap().min(1).max(50).optional(),
            }),
        },
    },
});
