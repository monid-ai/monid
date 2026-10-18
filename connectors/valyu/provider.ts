import { defineProvider, presets } from "@shared/core";
import { dollarModel } from "./usage.ts";

export default defineProvider({
    name: "valyu",
    meta: {
        displayName: "Valyu",
        summary: "Search web and research sources, and extract URL content.",
        description:
            "Search across web, academic, financial, and proprietary " +
            "sources with Valyu, then extract markdown, summaries, or " +
            "structured data from URLs. Both endpoints are synchronous and " +
            "share one API key and dollar-denominated credit pool.",
        homepageUrl: "https://www.valyu.ai",
        docsUrl: "https://docs.valyu.ai",
        categories: ["web-search", "news-search", "web-extraction"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.valyu.ai" },
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        credits: { default: { label: "US dollars" } },
        model: dollarModel,
        consolidate: ({ data, utils }) => {
            const search = utils.json.pluck(
                data.output,
                "$.total_deduction_dollars",
            );
            const contents = utils.json.pluck(
                search.rest,
                "$.total_cost_dollars",
            );
            const total = utils.json.optionalNum(
                data.output,
                "$.total_deduction_dollars",
            ) ??
                utils.json.optionalNum(data.output, "$.total_cost_dollars");
            if (total !== undefined && total < 0) {
                throw new Error("Valyu returned a negative cost receipt");
            }
            return {
                credits: { ...(total !== undefined ? { default: total } : {}) },
                output: contents.rest,
            };
        },
        evidence: ({ data, utils }) => {
            const receipt = utils.json.optionalNum(
                data.output,
                "$.total_deduction_dollars",
            ) ??
                utils.json.optionalNum(data.output, "$.total_cost_dollars");
            let total = receipt ?? 0;
            if (receipt === undefined) {
                const results = utils.json.optionalGet(
                    data.output,
                    "$.results",
                );
                if (Array.isArray(results)) {
                    for (const result of results) {
                        if (
                            result !== null && typeof result === "object" &&
                            !Array.isArray(result)
                        ) {
                            // Contents failures are free. A missing receipt
                            // falls back only to explicit per-result prices.
                            if (
                                result.status !== undefined &&
                                result.status !== "success"
                            ) continue;
                            const price = utils.json.optionalNum(
                                result,
                                "$.price",
                            );
                            if (price !== undefined && price < 0) {
                                throw new Error(
                                    "Valyu returned a negative result price",
                                );
                            }
                            total += price ?? 0;
                        }
                    }
                }
            }
            if (total < 0) {
                throw new Error("Valyu returned a negative cost receipt");
            }
            return { counts: { CREDIT: Math.round(total * 1_000_000_000) } };
        },
    },
});
