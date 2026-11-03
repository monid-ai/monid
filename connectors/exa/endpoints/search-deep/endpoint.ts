import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zExaDeepSearchBody } from "./schema/inputs.ts";

/**
 * Exa Deep Search — `POST /search` with a deep search type: several
 * searches, read and reasoned over, optionally filling a caller's JSON
 * Schema (`outputSchema` → `output.content`, sources in
 * `output.grounding`).
 *
 * Its own endpoint rather than a `type` value on exa#search: an agent
 * looking for multi-step research reads the capability and its price from
 * the endpoint it discovers. The PUBLIC identity is `/search/deep`
 * (design D22); the wire path is the shared `/search`.
 *
 * PER-TYPE BILLING (exa's published card): $0.012 per call for deep-lite
 * and deep, $0.015 for deep-reasoning, each covering the first 10 results,
 * plus $0.001 per result above 10 and per result summary. One PER_UNIT
 * line per price cell, `1` on the cell `type` selects (design D19); `type`
 * defaults to "deep" at the binding so the cell is always readable. Exa's
 * own `costDollars.total` settles every run (provider consolidate, D27).
 *
 * Deep runs take longer than the provider's 30 s budget allows, so the
 * endpoint overrides it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Exa Deep Search",
        summary: "Research a question across many searches and get JSON " +
            "answers with a source for each field.",
        description: "Runs several searches, reads the results and fills " +
            "the JSON Schema you pass in outputSchema. The answer is in " +
            "output.content and the sources for each field are in " +
            "output.grounding. Use it for wide schemas, comparisons and " +
            "questions that take more than one search. deep is the default. " +
            "deep-reasoning reasons longer for harder questions. deep-lite " +
            "is a lighter pass. $0.012 per call for deep and deep-lite and " +
            "$0.015 for deep-reasoning, each with up to 10 results. Each " +
            "result above 10 adds $0.001, and each result summary adds " +
            "$0.001.",
        docsUrl: "https://exa.ai/docs/reference/search",
        categories: ["web-search"],
    },
    endpoint: "/search/deep",
    request: { method: "POST", path: "/search" },
    timeouts: { requestMs: 180_000, runMs: 190_000 },
    input: {
        schema: {
            // `type` is the PRICE CELL's coordinate, so it defaults at the
            // binding (D25); numResults/moderation are the vendor defaults
            // exa#search applies too.
            body: zExaDeepSearchBody.extend({
                type: zExaDeepSearchBody.shape.type.unwrap().default("deep"),
                numResults: zExaDeepSearchBody.shape.numResults.unwrap()
                    .default(10),
                moderation: zExaDeepSearchBody.shape.moderation.unwrap()
                    .default(false),
            }),
        },
        // same defense-in-depth as exa#search: `stream` is not exposed, and
        // a pasted payload carrying it is stripped before send.
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.omit(data.input.body ?? {}, ["stream"]),
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                deep_search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.012 },
                    label: "deep search",
                    description: "base price for type deep-lite or deep, " +
                        "including the first 10 results",
                },
                deep_reasoning_search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.015 },
                    label: "deep-reasoning search",
                    description: "base price for type deep-reasoning, " +
                        "including the first 10 results",
                },
                additional_result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.001 },
                    label: "extra results",
                    description: "results above the 10 included in the " +
                        "base price",
                },
                summary: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.001 },
                    label: "result summaries",
                    description: "a contents.summary on each result",
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const cell = body.type === "deep-reasoning"
                ? "deep_reasoning_search"
                : "deep_search";
            const above = Math.max(0, body.numResults - 10);
            const summaries = body.contents?.summary !== undefined
                ? body.numResults
                : 0;
            return {
                counts: {
                    [cell]: 1,
                    ...(above > 0 ? { "additional_result": above } : {}),
                    ...(summaries > 0 ? { "summary": summaries } : {}),
                },
            };
        },
        evidence: ({ data, utils }) => {
            const body = data.input.body;
            const cell = body.type === "deep-reasoning"
                ? "deep_reasoning_search"
                : "deep_search";
            const results = utils.json.len(data.output, "$.results");
            const above = Math.max(0, results - 10);
            let summaries = 0;
            if (body.contents?.summary !== undefined) {
                const rows = utils.json.optionalGet(data.output, "$.results");
                if (Array.isArray(rows)) {
                    for (const row of rows) {
                        const text = utils.json.optionalGet(row, "$.summary");
                        if (typeof text === "string") summaries += 1;
                    }
                }
            }
            return {
                counts: {
                    [cell]: 1,
                    ...(above > 0 ? { "additional_result": above } : {}),
                    ...(summaries > 0 ? { "summary": summaries } : {}),
                },
            };
        },
    },
});
