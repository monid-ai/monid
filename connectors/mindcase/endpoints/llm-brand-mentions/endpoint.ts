import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLlmBrandMentionsBody } from "./schema/inputs.ts";

/**
 * Mindcase `llm/brand-mentions`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LLM Brand Mentions",
        summary: "How AI assistants answer your prompts and whether they " +
            "mention your brand or competitors, with assistant, model, " +
            "country and the full answer. Pass prompts...",
        description: "How AI assistants answer your prompts and whether they " +
            "mention your brand or competitors, with assistant, model, " +
            "country and the full answer. Pass prompts, brand aliases, " +
            "competitors and assistants. Returns one row per answer with " +
            "prompt, assistant, model, country, answeredAt, aiAnswer, " +
            "brand, brandMentioned, brandPosition, brandCited, " +
            "brandCitedUrls, brandsNamed, competitorsNamed, shareOfVoice, " +
            "aiAnswerSources, sourcesCount, searchQueries, products, " +
            "rowId. For a single assistant answer with sources use " +
            "mindcase#ai/answers. $0.006 per answer; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/llm/brand-mentions",
        categories: ["geo", "ai-search"],
    },
    endpoint: "/llm/brand-mentions",
    request: { method: "POST", path: "/v1/data/llm/brand-mentions/run" },
    input: {
        schema: {
            body: zLlmBrandMentionsBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.006 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.prompts.length +
                body.brand.split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length + (body.brandAliases?.length ?? 0) +
                (body.competitors?.length ?? 0);
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
