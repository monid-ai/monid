import { defineProvider, presets } from "@shared/core";

export default defineProvider({
    name: "tako",
    meta: {
        displayName: "Tako",
        summary: "Search structured data and the web in one call, with " +
            "cited charts and the data behind them.",
        description: "Tako searches a knowledge graph of licensed, " +
            "structured data and the live web in the same call. Data " +
            "results are cards: a chart or table with its sources, a " +
            "description of what it shows, and rows you can fetch. " +
            "Coverage includes markets and company fundamentals, " +
            "economic indicators, people and companies, website " +
            "traffic and SEO, sports, weather, prediction markets, " +
            "demographics, energy, and real estate. Search with " +
            "tako#v3/search, then fetch a card's rows or a web page's " +
            "text with tako#v1/contents.",
        homepageUrl: "https://tako.com",
        docsUrl: "https://docs.tako.com",
        categories: [
            "web-search",
            "news-search",
            "people-enrichment",
            "company-enrichment",
            "seo",
            "equities",
            "prediction-markets",
            "macro-data",
            "weather",
            "sports",
            "web-scraping",
            "web-extraction",
        ],
        notes: [
            "Each call settles at the cost Tako reports in the " +
            "response's usage.total_cost_usd. The connector holds an " +
            "upper bound on that cost before the call.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://tako.com/api" },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        credits: { default: { label: "US dollars" } },
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(data.output, "$.usage");
            const total = value === undefined || value === null
                ? undefined
                : utils.json.optionalNum(value, "$.total_cost_usd");
            return {
                credits: {
                    ...(total !== undefined ? { default: total } : {}),
                },
                output: rest,
            };
        },
        evidence: ({ data, utils }) => {
            const model = data.usage.model;
            if (model.kind !== "COMPOSITE") return { counts: {} };
            const call = model.components.call;
            const metered = model.components.metered;
            if (call?.kind !== "PER_CALL" || metered?.kind !== "PER_UNIT") {
                return { counts: {} };
            }
            const total = utils.json.optionalNum(
                data.output,
                "$.usage.total_cost_usd",
            );
            if (total === undefined) return { counts: {} };
            const unit = metered.consumes.amount;
            const units = Math.max(
                0,
                Math.round(total / unit) -
                    Math.round(call.consumes.amount / unit),
            );
            const counts: Record<string, number> = {};
            if (units > 0) counts.metered = units;
            return { counts };
        },
    },
    output: {
        fromError: ({ data, utils }) => {
            const candidates = [
                utils.json.optionalGet(data.output, "$.error_message"),
                utils.json.optionalGet(data.output, "$.detail"),
            ];
            const message = candidates.find((v) =>
                typeof v === "string" && v !== ""
            );
            const errorType = utils.json.optionalGet(
                data.output,
                "$.error_type",
            );
            return {
                message: typeof message === "string" ? message : "Tako error",
                ...(typeof errorType === "string" ? { code: errorType } : {}),
                raw: data.output,
            };
        },
    },
});
