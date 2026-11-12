import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import {
    DATA_SOURCE_DESCRIPTION,
    SOURCES_DESCRIPTION,
    WEB_SOURCE_DESCRIPTION,
    zDataSourceSettings,
    zSearchBody,
    zSources,
    zWebSourceSettings,
} from "./schema/inputs.ts";

const zDataSourceBinding = zDataSourceSettings.omit({ variable_cost: true })
    .extend({
        count: zDataSourceSettings.shape.count.unwrap().default(5),
        include_contents: zDataSourceSettings.shape.include_contents.unwrap()
            .default(false),
        max_rows: zDataSourceSettings.shape.max_rows.unwrap().default(20)
            .describe(
                "Maximum rows to inline per card when include_contents is " +
                    "true. Defaults to 20.",
            ),
        max_variable_cost_usd: zDataSourceSettings.shape.max_variable_cost_usd
            .unwrap().default(0.25).describe(
                "The most this response pays for data priced per unit, such " +
                    "as website traffic and SEO data, in USD. Defaults to " +
                    "0.25. A card whose price doesn't fit in what's left of " +
                    "the cap comes back as a placeholder with " +
                    "placeholder.reason 'over_cap'. Send 0 to pay nothing " +
                    "above the base price: Tako then serves data only for " +
                    "the cards whose minimum price the base price covers.",
            ),
    });

const zWebSourceBinding = zWebSourceSettings.extend({
    highlights: zWebSourceSettings.shape.highlights.unwrap().default(true),
});

export default defineEndpoint({
    meta: {
        displayName: "Tako Search",
        summary: "Search structured data cards and the web in one call.",
        description: "Search Tako's knowledge graph of licensed, " +
            "structured data and the live web in one call. Returns cards " +
            "(each a chart or table with its sources, a description of " +
            "what it shows, and a webpage_url) and web results. Phrase " +
            "the query the way a person would ask it, such as 'Nvidia " +
            "revenue by segment' or 'unemployment rate in Texas'. Cards " +
            "cover markets and company fundamentals, economic indicators, " +
            "people and companies, website traffic and SEO, sports, " +
            "weather, prediction markets, and more. Set " +
            "sources.data.include_contents to inline each card's rows, or " +
            "pass a card's webpage_url to tako#v1/contents for the full " +
            "data. Omit sources to search both data and the web.",
        docsUrl:
            "https://docs.tako.com/documentation/integrating-tako/search/overview",
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
        ],
        notes: [
            "Every search bills its base price, $0.007 at fast and instant " +
            "and $0.012 at deep, including one that returns no cards.",
            "Website traffic and SEO cards add a per-card price on top of " +
            "the base price, bounded by sources.data.max_variable_cost_usd. " +
            "The hold includes the whole cap; the charge is only what the " +
            "served cards cost.",
            "sources.data.include_contents bills $0.001 per inlined card " +
            "plus each inlined row. Web include_contents and highlights " +
            "are free.",
            "Sending sources without a data key searches only the web, and " +
            "without a web key searches only data.",
            "Tako rejects an empty sources object with a 400. Send at least " +
            "one of data or web.",
            "With sources.data.include_contents, the hold covers every " +
            "card in sources.data.count at max_rows rows each, at the most " +
            "Tako bills per row, $1.60 per 1,000 rows. Most cards bill far " +
            "less.",
        ],
    },
    request: { method: "POST", path: "/v3/search" },
    input: {
        schema: {
            body: zSearchBody.omit({ variable_cost: true, zdr: true }).extend({
                effort: zSearchBody.shape.effort.unwrap().default("fast"),
                sources: zSources.extend({
                    data: zDataSourceBinding.describe(DATA_SOURCE_DESCRIPTION)
                        .optional(),
                    web: zWebSourceBinding.describe(WEB_SOURCE_DESCRIPTION)
                        .optional(),
                }).describe(SOURCES_DESCRIPTION).prefault({
                    data: {},
                    web: {},
                }),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.007 },
                    label: "base price",
                    description: "one search at fast or instant effort",
                },
                metered: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.CREDIT,
                    consumes: { credit: "default", amount: 0.00001 },
                    label: "usage above base price, $0.00001 units",
                    description: "the deep effort premium, inlined card " +
                        "data, and per-unit data such as website traffic",
                },
            },
        },
        estimate: ({ data }) => {
            const model = data.usage.model;
            if (model.kind !== "COMPOSITE") return { counts: {} };
            const metered = model.components.metered;
            if (metered?.kind !== "PER_UNIT") return { counts: {} };
            const unitsPerUsd = Math.round(1 / metered.consumes.amount);
            const deepPremiumUsd = 0.005;
            const inlinedCardUsd = 0.001;
            const inlinedRowUsd = 0.0016;
            const responseRowBudget = 2_000;
            const rowFloorPerCard = 20;
            const body = data.input.body;
            const dataSource = body.sources.data;
            const deepPremium = body.effort === "deep"
                ? Math.round(deepPremiumUsd * unitsPerUsd)
                : 0;
            const variableCost = dataSource === undefined
                ? 0
                : Math.ceil(dataSource.max_variable_cost_usd * unitsPerUsd);
            const inlined = dataSource?.include_contents
                ? dataSource
                : undefined;
            const inlinedContents = inlined === undefined
                ? 0
                : inlined.count * Math.round(inlinedCardUsd * unitsPerUsd) +
                    Math.min(
                            inlined.count * inlined.max_rows,
                            responseRowBudget +
                                rowFloorPerCard * inlined.count,
                        ) * Math.round(inlinedRowUsd * unitsPerUsd);
            const units = deepPremium + variableCost + inlinedContents;
            return { counts: units > 0 ? { metered: units } : {} };
        },
    },
});
