import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLev8DeepSearchBody } from "./schema/inputs.ts";

/**
 * POST /v1/deep-search — one research question, answered synchronously.
 *
 * 2 credits when `success` is true, 0 when it is false (a business-level
 * failure still answers 200). A flat PER_CALL would bill the failure, so the
 * line is PER_UNIT over successful answers (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Lev8 Deep Search",
        summary: "Answer a natural-language research question in one call.",
        description: "Answer an open-ended research question about " +
            "companies, people or markets from a single natural-language " +
            "query, synchronously. The answer is free-form JSON — today " +
            "usually an object with `Result` (the answer text) and " +
            "`Citations` — and its shape is not guaranteed. Use it for " +
            "one question with one answer. To list many matching entities " +
            "use Lev8 Entity Search; to fill a fixed set of fields for an " +
            "entity you already know use Lev8 Enrich.",
        docsUrl: "https://docs.lev8.com/api-reference/deep-search/run",
        categories: ["ai-search"],
        notes: [
            "2 credits per successful answer. `success: false` is a " +
            "business-level failure and costs nothing.",
            "Can take several minutes; Lev8 allows up to 10.",
        ],
    },
    request: { method: "POST", path: "/v1/deep-search" },
    input: { schema: { body: zLev8DeepSearchBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "successful answers",
            description: "answers returned with `success: true`",
            consumes: { credit: "default", amount: 2 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.optionalGet(data.output, "$.success") ===
                        true
                    ? 1
                    : 0,
            },
        }),
    },
});
