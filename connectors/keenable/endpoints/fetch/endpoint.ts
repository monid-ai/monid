import { defineEndpoint } from "@shared/core";
import { zKeenableFetchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/fetch — clean markdown for a known URL.
 *
 * Usage falls back to the provider's PER_CALL 1 credit; estimate and
 * evidence are compiler-synthesized (flat model).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Fetch",
        summary: "Fetch a URL as clean, LLM-ready markdown.",
        description: "Retrieve a page as clean markdown, with title, " +
            "description, and author when available. This returns " +
            "Keenable's indexed copy — a URL that is not in the index " +
            "is an error. Cap returned content with 'max_chars', or " +
            "pass 'prompt' (at most 2000 characters) so an LLM reads " +
            "the page and `content` is only the instruction's output " +
            "instead of the full text. Use this when you already know " +
            "the URL; start from /search if you don't.",
        docsUrl: "https://docs.keenable.ai/api-reference/fetch",
        categories: ["web-scraping"],
        notes: [
            "Indexed fetch (`fetch`) costs one credit. Live fetch " +
            "(`fetch.live`) is a separate SKU that 'draws more than " +
            "one' without a published number, so `live` is not a " +
            "request parameter on this doc (design D4).",
        ],
    },
    request: { method: "GET", path: "/v1/fetch" },
    input: {
        schema: {
            queryParams: zKeenableFetchQueryParams.extend({
                max_chars: zKeenableFetchQueryParams.shape.max_chars
                    .unwrap().min(1).optional(),
                prompt: zKeenableFetchQueryParams.shape.prompt.unwrap()
                    .min(1).max(2000).optional(),
            }),
        },
    },
});
