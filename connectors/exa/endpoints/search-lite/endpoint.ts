import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
 * BASE-PLUS-OVERAGE billing (exa's published card): $0.004 per call
 * including the first 10 results, plus $0.001 per result above 10 — a
 * flat "call" line and a metered "additional_result" line whose count is
 * the OFFSET rule `max(0, results − 10)` (design D19). Exa's own
 * `costDollars.total` settles every run (provider consolidate, D27).
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
            "fetched at query time. $0.004 per call with up to 10 results, " +
            "plus $0.001 per result above 10.",
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
                    .default(10),
                moderation: zExaLiteSearchBody.shape.moderation.unwrap()
                    .default(false),
            }),
        },
        // pin the search type; a caller-supplied `type` (the schema is
        // non-strict) is overwritten rather than forwarded.
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, { type: "lite" }),
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.004 },
                    label: "base fee",
                    description: "base fee, includes the first 10 results",
                },
                additional_result: {
                    kind: UsageModelKind.PER_UNIT,
                    consumes: { credit: "default", amount: 0.001 },
                    unit: Unit.RESULT,
                    label: "extra results",
                    description:
                        "results above the 10 included in the base fee",
                },
            },
        },
        /** OFFSET estimate: only the requested surplus above the included
         *  10 is promisable. */
        estimate: ({ data }) => {
            const above = Math.max(0, data.input.body.numResults - 10);
            return {
                counts: {
                    ...(above > 0 ? { "additional_result": above } : {}),
                },
            };
        },
        evidence: ({ data, utils }) => {
            const results = utils.json.len(data.output, "$.results");
            const above = Math.max(0, results - 10);
            return {
                counts: {
                    ...(above > 0 ? { "additional_result": above } : {}),
                },
            };
        },
    },
});
