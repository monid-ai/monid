import { defineEndpoint } from "@shared/core";
import { zKeenableFetchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/fetch — clean markdown for a known URL.
 *
 * Usage falls back to the provider's PER_CALL 1 credit; estimate and
 * evidence are compiler-synthesized (flat model).
 *
 * `live` is optional with the vendor default (design D6, revised
 * 2026-11-07): an omitted `live` serves the indexed copy and reads
 * unindexed URLs live, so it is both faster and never a provider
 * error for a missing URL.
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Fetch",
        summary:
            "Read a known URL as clean Markdown contents, or ask a question about the page.",
        description: "Contents for a known URL: clean Markdown with " +
            "title and author, $0.001 per page. By default Keenable " +
            "serves its indexed copy and reads the page live when it " +
            "is not indexed; set live: true to always read it live. " +
            "Add " +
            'prompt (up to 2,000 characters, e.g. "list every ' +
            'pricing tier with its monthly price") and an LLM ' +
            "reads the page and returns only the answer. max_chars " +
            "caps the length; truncated and total_chars say when " +
            "a page was cut. One URL per call. Prefer " +
            "keenable#v1/search-contents when you do not have URLs " +
            "yet — that search already returns long extracts. Will " +
            "not: log in, click through pages, or get past bot " +
            "protection; use a browser-agent endpoint for those. " +
            "Find URLs first with keenable#v1/search.",
        docsUrl: "https://docs.keenable.ai/api-reference/fetch",
        categories: ["web-scraping", "web-extraction"],
        notes: [
            "$0.001 per page (volume rate), indexed or live, with or " +
            "without a prompt. Errors are free. A URL missing from the " +
            "index is read live automatically.",
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
                live: zKeenableFetchQueryParams.shape.live,
            }),
        },
    },
});
