import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompaniesByTechnologyBody } from "./schema/inputs.ts";

/**
 * Mindcase `companies/by-technology`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Company Technology Lookup",
        summary: "Finds companies and websites currently using a given " +
            "technology, category, or technology group.",
        description: "Finds companies and websites currently using a given " +
            "technology, category, or technology group. Returns one row " +
            "per domain with domain, rank, title, description, country, " +
            "language, lastVisited, technologies, queryInput. For one " +
            "site's full tech stack use mindcase#builtwith/techstack; to " +
            "enrich the companies returned use " +
            "mindcase#companies/enrichment. $0.0025 per domain; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/companies/by-technology",
        categories: ["company-enrichment"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/companies/by-technology",
    request: { method: "POST", path: "/v1/data/companies/by-technology/run" },
    input: {
        schema: {
            body: zCompaniesByTechnologyBody.extend({
                maxResults: zCompaniesByTechnologyBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many domains to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
