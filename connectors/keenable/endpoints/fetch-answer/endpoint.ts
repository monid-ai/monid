import { defineEndpoint } from "@shared/core";
import { zKeenableFetchAnswerQueryParams } from "./schema/inputs.ts";

/**
 * Prompt-required twin of `GET /v1/fetch` — the fetch-with-prompt path
 * as its own endpoint so discover can rank it for page Q&A /
 * extraction. Same PER_CALL 1 credit (design D4). live keeps the
 * vendor default (design D6, revised 2026-11-07).
 *
 * PUBLIC identity is pinned (design D22): the vendor path is transport
 * plumbing shared with `/v1/fetch`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Page Answer",
        summary:
            "Ask a question about a public URL; an LLM reads the page and returns only the answer.",
        description: "Fetches a public URL and has an LLM answer a " +
            "prompt about the page instead of returning the full " +
            "Markdown. prompt is required (up to 2,000 characters, " +
            'e.g. "list every pricing tier with its monthly price"). ' +
            "By default Keenable serves its indexed copy and reads the " +
            "page live when it is not indexed; set live: true to " +
            "always read it live. max_chars caps " +
            "the answer length. One URL per call. Will not: log in, " +
            "click through pages, or get past bot protection. Find " +
            "URLs first with keenable#v1/search; use keenable#v1/fetch " +
            "when you want the full page as Markdown.",
        docsUrl: "https://docs.keenable.ai/api-reference/fetch",
        categories: ["web-extraction"],
        notes: [
            "Same $0.001 volume rate as keenable#v1/fetch. prompt is " +
            "required. A URL missing from the index is read live " +
            "automatically.",
        ],
    },
    /** PUBLIC identity (design D22): shares upstream `GET /v1/fetch`. */
    endpoint: "/v1/fetch-answer",
    request: { method: "GET", path: "/v1/fetch" },
    input: {
        schema: {
            queryParams: zKeenableFetchAnswerQueryParams.extend({
                max_chars: zKeenableFetchAnswerQueryParams.shape.max_chars
                    .unwrap().min(1).optional(),
                prompt: zKeenableFetchAnswerQueryParams.shape.prompt.unwrap()
                    .min(1).max(2000).regex(/\S/),
                live: zKeenableFetchAnswerQueryParams.shape.live,
            }),
        },
    },
});
