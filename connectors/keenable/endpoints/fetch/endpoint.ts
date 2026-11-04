import { defineEndpoint } from "@shared/core";
import { zKeenableFetchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/fetch — clean markdown for a known URL.
 *
 * Usage falls back to the provider's PER_CALL 1 credit; estimate and
 * evidence are compiler-synthesized (flat model).
 *
 * `live` defaults to true at the binding (design D6): indexed and live
 * cost the same credit, and an omitted `live` used to turn every
 * non-indexed URL into a provider error. Callers who want the indexed
 * copy only set `live: false`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Fetch",
        summary:
            "Read a known URL as clean Markdown contents, or ask a question about the page.",
        description: "Contents for a known URL: clean Markdown with " +
            "title and author, $0.001 per page. By default (live: " +
            "true) the page is fetched live from the source, which " +
            "is a few seconds slower than the index. Set live: false " +
            "to serve only Keenable's indexed copy; a URL not in the " +
            "index is then an error. Add " +
            'prompt (up to 2,000 characters, e.g. "list every ' +
            'pricing tier with its monthly price") and an LLM ' +
            "reads the page and returns only the answer. max_chars " +
            "caps the length. One URL per call. Prefer " +
            "keenable#v1/search-contents when you do not have URLs " +
            "yet — that search already returns long extracts. Will " +
            "not: log in, click through pages, or get past bot " +
            "protection; use a browser-agent endpoint for those. " +
            "Find URLs first with keenable#v1/search.",
        docsUrl: "https://docs.keenable.ai/api-reference/fetch",
        categories: ["web-scraping", "web-extraction"],
        notes: [
            "$0.001 per page (volume rate), indexed or live, with or " +
            "without a prompt. Errors are free. live defaults to true " +
            "so a URL missing from the index is fetched from the source.",
        ],
    },
    request: { method: "GET", path: "/v1/fetch" },
    input: {
        schema: {
            queryParams: zKeenableFetchQueryParams.extend({
                max_chars: zKeenableFetchQueryParams.shape.max_chars
                    .unwrap().min(1).optional(),
                prompt: zKeenableFetchQueryParams.shape.prompt.unwrap()
                    .min(1).max(2000).regex(/\S/).optional(),
                live: zKeenableFetchQueryParams.shape.live.unwrap()
                    .default(true),
            }),
        },
    },
});
