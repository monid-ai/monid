import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zRevealSearchBody } from "./schema/inputs.ts";

/** POST /reveal/search — search Tomba's company database. */
export default defineEndpoint({
    meta: {
        displayName: "Search Companies",
        summary:
            "Search Tomba's company database with structured filters or a natural-language query.",
        description: "Find companies by location (country, state, city), " +
            "industry, size, type, founding year, revenue, keywords, " +
            "technologies, SIC / NAICS codes, or similarity to reference " +
            "domains — each filter an include / exclude list — or describe " +
            "them in plain language ('Real estate agencies in Europe') and " +
            "let Tomba generate the filters. Returns 50 companies per page " +
            "with name, description, address, industry, size, type, " +
            "founding year, website, revenue, social links, and how many " +
            "email addresses Tomba has for each. Suited for building " +
            "target-account lists; pass a website_url to /domain-search for " +
            "the contacts.",
        docsUrl: "https://docs.tomba.io/api/reveal#search-companies",
        categories: ["company-enrichment"],
        notes: [
            "Charged 1 search credit per request, only when at least one " +
            "company is returned.",
            "When query is sent, filters are generated from it with an AI " +
            "model and any filters sent are ignored; reuse the returned " +
            "meta.filters for the next pages instead of the query.",
            "This endpoint has a fixed rate limit, independent of the plan.",
        ],
    },
    request: { method: "POST", path: "/reveal/search" },
    input: {
        schema: {
            body: z.union([
                zRevealSearchBody.required({ query: true }),
                zRevealSearchBody.required({ filters: true }),
            ]).describe("Provide query or filters."),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            label: "result pages",
            description: "pages returning at least one company",
            consumes: { credit: "search", amount: 1 },
        },
        estimate: () => ({ counts: { PAGE: 1 } }),
        /** Charged when `data.companies[]` is non-empty. */
        evidence: ({ data, utils }) => {
            const companies = utils.json.optionalGet(
                data.output,
                "$.data.companies",
            );
            return {
                counts: {
                    PAGE: Array.isArray(companies) && companies.length > 0
                        ? 1
                        : 0,
                },
            };
        },
    },
});
