import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiAnswersBody } from "./schema/inputs.ts";

/**
 * Mindcase `ai/answers`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "AI Assistant Answers",
        summary:
            "Returns an AI assistant's answer to a prompt with its cited " +
            "sources, localised by country.",
        description:
            "Returns an AI assistant's answer to a prompt with its cited " +
            "sources, localised by country. Returns one row per answer " +
            "with prompt, assistant, country, model, aiAnswer, " +
            "aiAnswerSources. To track whether assistants mention your " +
            "brand vs competitors use mindcase#llm/brand-mentions. $0.008 " +
            "per answer; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ai/answers",
        categories: ["ai-search", "geo"],
    },
    endpoint: "/ai/answers",
    request: { method: "POST", path: "/v1/data/ai/answers/run" },
    input: {
        schema: {
            body: zAiAnswersBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.008 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.prompts.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
