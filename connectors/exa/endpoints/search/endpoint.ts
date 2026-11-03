import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zExaSearchBody } from "./schema/inputs.ts";

/**
 * Exa /search — neural + keyword search across the open web.
 *
 * PER-TYPE BILLING (exa's published card): the base price of a call depends
 * on the search `type` and covers the first 10 results —
 *   lite / instant / neural   $0.004
 *   auto / fast               $0.007
 *   deep-lite / deep          $0.012
 *   deep-reasoning            $0.015
 * — plus $0.001 per result above 10 and $0.001 per result summary
 * (`contents.summary`). Text and highlights are included in the base.
 *
 * The base is a rate SELECTION, so per design D19 it is a COUNTING rule:
 * one PER_UNIT line per price cell, and the fns put `1` on the cell the
 * request's `type` selects (the minimax per-cell posture). `type` defaults
 * to "auto" at the binding, so the cell is always readable. Exa's own
 * `costDollars.total` still settles every run (provider consolidate, D27);
 * the cells make the estimate and the published card honest per type.
 *
 * Fn bodies are closed terms (names are string literals; imports would fail
 * the compiler lint), so the type → cell map is written out in each fn.
 */
export default defineEndpoint({
    meta: {
        displayName: "Exa Search",
        summary: "Search the web for any topic. Returns ranked pages with " +
            "clean text or highlights, or JSON you define.",
        description: "Searches the web and returns ranked pages with their " +
            "content in one call. Write the query as a description of the " +
            'page you want, such as "blog post comparing React and Vue ' +
            'performance". Set contents.highlights to true for the most ' +
            "relevant passages of each page, or contents.text for full page " +
            "text. Without contents, results carry only title, URL and " +
            "dates. Add outputSchema to get a JSON object filled from the " +
            "results. The search types differ in speed, depth and price. " +
            "auto is the default. lite " +
            "and instant are the fastest and cheapest. deep-lite, deep and " +
            "deep-reasoning run several searches for wide schemas and " +
            "multi-step questions. category limits results to one kind of " +
            "page, such as company pages, people profiles, news or research " +
            "papers. Priced per call by type. $0.004 for lite, instant and " +
            "neural. $0.007 for auto and fast. $0.012 for deep-lite and " +
            "deep. $0.015 for deep-reasoning. Each call includes 10 results. " +
            "Each result above 10 adds $0.001, and each result summary adds " +
            "$0.001.",
        notes: [
            "type lite rejects outputSchema, systemPrompt, " +
            "contents.summary and contents.maxAgeHours.",
        ],
        docsUrl: "https://exa.ai/docs/reference/search",
        categories: ["web-search"],
    },
    request: { method: "POST", path: "/search" },
    input: {
        schema: {
            // vendor-documented API defaults, applied at the binding (moved
            // from the mirror — D25: mirrors carry optionality only):
            // type "auto", numResults 10, moderation false. `type` is also
            // the PRICE CELL's coordinate, so it must always be readable.
            body: zExaSearchBody.extend({
                type: zExaSearchBody.shape.type.unwrap().default("auto"),
                numResults: zExaSearchBody.shape.numResults.unwrap()
                    .default(10),
                moderation: zExaSearchBody.shape.moderation.unwrap()
                    .default(false),
            }),
        },
        // exa rejects `stream`; the schema doesn't expose it, but it is
        // non-strict (newer exa params pass through) — strip as defense-in-depth.
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.omit(data.input.body ?? {}, ["stream"]),
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                lite_search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.004 },
                    label: "lite, instant or neural search",
                    description: "base price for type lite, instant or " +
                        "neural, including the first 10 results",
                },
                standard_search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.007 },
                    label: "auto or fast search",
                    description: "base price for type auto or fast, " +
                        "including the first 10 results",
                },
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
        /** Promise the cell `type` selects, the requested surplus above the
         *  included 10, and a summary per requested result when asked. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const type = body.type;
            const cell = type === "lite" || type === "instant" ||
                    type === "neural"
                ? "lite_search"
                : type === "deep-lite" || type === "deep"
                ? "deep_search"
                : type === "deep-reasoning"
                ? "deep_reasoning_search"
                : "standard_search";
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
        /** Settle on DELIVERED results: the same cell, the surplus above the
         *  included 10, and one summary per returned result that carries
         *  one. The costDollars receipt is the provider consolidate's job
         *  (claim + strip — design D27). */
        evidence: ({ data, utils }) => {
            const body = data.input.body;
            const type = body.type;
            const cell = type === "lite" || type === "instant" ||
                    type === "neural"
                ? "lite_search"
                : type === "deep-lite" || type === "deep"
                ? "deep_search"
                : type === "deep-reasoning"
                ? "deep_reasoning_search"
                : "standard_search";
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
