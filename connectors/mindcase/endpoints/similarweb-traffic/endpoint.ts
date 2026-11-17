import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSimilarwebTrafficBody } from "./schema/inputs.ts";

/**
 * Mindcase `similarweb/traffic`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Web Traffic",
        summary: "Traffic estimates for any website: monthly visits, global " +
            "and category rank, engagement, where the traffic comes from, " +
            "which countries and keywords drive...",
        description:
            "Traffic estimates for any website: monthly visits, global " +
            "and category rank, engagement, where the traffic comes from, " +
            "which countries and keywords drive it, and how much of it " +
            "now arrives from AI assistants. Returns one row per domain " +
            "with domain, siteName, title, description, category, " +
            "globalRank, categoryRank, countryRank, topCountry, " +
            "monthlyVisits, snapshotMonth, bounceRate, pagesPerVisit, " +
            "avgVisitDuration, trafficSources, visitsByMonth, " +
            "topCountries, topKeywords, topAiSources, aiVisits, " +
            "aiTrafficShare. One or more domains or website URLs. For " +
            "competitor discovery from a domain use " +
            "mindcase#similarweb/similar-sites. $0.002 per domain; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/similarweb/traffic",
        categories: ["web-traffic"],
        notes: [
            "Bills one row per input looked up; `maxResults` (optional) " +
            "only stops the run early.",
        ],
    },
    endpoint: "/similarweb/traffic",
    request: { method: "POST", path: "/v1/data/similarweb/traffic/run" },
    input: {
        schema: {
            body: zSimilarwebTrafficBody.extend({
                maxResults: zSimilarwebTrafficBody.shape.maxResults.unwrap()
                    .min(1).optional().describe(
                        "Stop after this many domains have been looked up. Each domain costs one row, so this caps the bill as well as the output.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.domains.length;
            const rows = Math.min(body.maxResults ?? Infinity, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
