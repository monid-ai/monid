import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zIdeasQueryParams } from "./schema/inputs.ts";

/**
 * GET /ideas — AI research ideas by change in share of new papers.
 * $0.02 when the answer carries at least one idea; `ideas: []` is free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Vela Breakout AI Research Ideas",
        summary: "AI research ideas gaining or losing share of new " +
            "papers, with the companies publishing on each.",
        description: "Which AI research ideas are gaining (or losing) " +
            "ground: each idea's share of all new AI research papers in " +
            "the last 3 months against the 3 months before ('4.7% to " +
            "5.6%, +0.9 points'), a 1-5 score for how ready it is for " +
            "products, the companies publishing on it with their paper " +
            "counts, and a link to the idea's page. Shares, not paper " +
            "counts, so the overall growth of research does not inflate " +
            "every idea. Use it to spot technical directions before they " +
            "reach products. Does not return individual papers or " +
            "authors, and does not rank products — for product and " +
            "company growth use /breakouts or /rising-companies.",
        docsUrl: "https://breakout.vela.partners/agent",
        categories: ["market-trends"],
    },
    request: { method: "GET", path: "/ideas" },
    input: { schema: { queryParams: zIdeasQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "idea lists with ideas",
            description: "one /ideas call that returned at least one idea",
            consumes: { credit: "default", amount: 0.02 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Bills only when `ideas` is non-empty — an empty list is free to
         *  the buyer. */
        evidence: ({ data, utils }) => {
            const ideas = utils.json.optionalGet(data.output, "$.ideas");
            return {
                counts: {
                    RESULT: Array.isArray(ideas) && ideas.length > 0 ? 1 : 0,
                },
            };
        },
    },
});
