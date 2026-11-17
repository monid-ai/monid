import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zZillowAgentsBody } from "./schema/inputs.ts";

/**
 * Mindcase `zillow/agents`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Zillow Agents",
        summary:
            "Zillow real estate agents with name, profile URL, brokerage, " +
            "title and team. Search by location, language or specialty.",
        description:
            "Zillow real estate agents with name, profile URL, brokerage, " +
            "title and team. Search by location, language or specialty. " +
            "Returns one row per agent with agentId, agentName, username, " +
            "profileUrl, brokerage, title, teamName, phone, " +
            "businessPhone, email, website, socials, rating, reviews, " +
            "salesLast12Months, totalSales, priceRange, minSalePrice, " +
            "maxSalePrice, averageSalePrice, activeListingsCount, " +
            "activeRentalsCount, isTopAgent, isPremierAgent, " +
            "yearsInIndustry, memberSince, specialties, languages, " +
            "serviceAreas, licenses and 12 more fields. For property " +
            "listings use mindcase#zillow/listings. $0.003 per agent; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/zillow/agents",
        categories: ["real-estate"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/zillow/agents",
    request: { method: "POST", path: "/v1/data/zillow/agents/run" },
    input: {
        schema: {
            body: zZillowAgentsBody.extend({
                maxResults: zZillowAgentsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many agents to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.003 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
