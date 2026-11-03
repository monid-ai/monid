import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zExaLiteSearchBody } from "./schema/inputs.ts";

/**
 * Exa Lite Search — `POST /search` pinned to `type: "lite"`, Exa's fastest
 * and lowest-cost search.
 *
 * Its own endpoint rather than a `type` value on exa#search: lite takes a
 * reduced parameter set (see schema/inputs.ts) and a lower price, and an
 * agent choosing a search tool reads both from the endpoint it discovers.
 * The PUBLIC identity is `/search/lite` (design D22); the wire path is the
 * shared `/search`.
 *
 * Flat billing: $0.004 per call, capped at 10 results at the binding.
 * Exa's own costDollars.total settles every run (provider consolidate).
 */
export default defineEndpoint({
    meta: {
        displayName: "Exa Lite Search",
        summary: "Fast, low-cost web search for agent loops. Ranked pages " +
            "with highlights for $0.004 a call.",
        description: "Exa's fastest and lowest-cost search, for chat, voice " +
            "and agent loops that search many times. Returns ranked pages " +
            "with titles, URLs and dates. Set contents.highlights to true " +
            "for the most relevant passages of each page, or contents.text " +
            "for full page text. Pages come from Exa's index and are not " +
            "fetched at query time. Returns up to 10 results. $0.004 per call. " +
            "Use Exa Search for more results.",
        docsUrl: "https://exa.ai/docs/reference/search",
        categories: ["web-search"],
    },
    endpoint: "/search/lite",
    request: { method: "POST", path: "/search" },
    input: {
        schema: {
            // vendor-documented API defaults, applied at the binding (D25):
            // numResults 10, moderation false.
            body: zExaLiteSearchBody.extend({
                numResults: zExaLiteSearchBody.shape.numResults.unwrap()
                    .max(10).default(10),
                moderation: zExaLiteSearchBody.shape.moderation.unwrap()
                    .default(false),
            }).strict(),
        },
        // pin the search type after strict validation of caller inputs.
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, { type: "lite" }),
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.004 },
        },
    },
});
