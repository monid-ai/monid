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
            "Read any public URL as clean Markdown, or ask a question about the page.",
        description: "Turns a public URL into clean Markdown with title " +
            "and author. Serves Keenable's indexed copy when the page " +
            "is in the index (fast and predictable) and fetches it " +
            "live from the source otherwise. Set live: true to always " +
            "get the current page; set live: false to require the " +
            "indexed copy. Add prompt (up to 2,000 characters, e.g. " +
            '"list every pricing tier with its monthly price") and ' +
            "an LLM reads the page and returns only the answer. " +
            "max_chars caps the length. One URL per call. Will not: " +
            "log in, click through pages, or get past bot protection; " +
            "use a browser-agent endpoint for those. Find URLs first " +
            "with keenable#v1/search.",
        docsUrl: "https://docs.keenable.ai/api-reference/fetch",
        categories: ["web-scraping", "web-extraction"],
        notes: [
            "One credit per page, indexed or live, with or without a " +
            "prompt. Errors are free. live defaults to true so a URL " +
            "missing from the index is fetched from the source.",
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
