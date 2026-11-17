import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAhrefsSerpOverviewBody } from "./schema/inputs.ts";

/**
 * Mindcase `ahrefs/serp-overview`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Ahrefs SERP Snapshot",
        summary: "Returns a stored snapshot of Google's top organic search " +
            "results for a keyword, with page-level authority and traffic " +
            "metrics.",
        description:
            "Returns a stored snapshot of Google's top organic search " +
            "results for a keyword, with page-level authority and traffic " +
            "metrics. Returns one row per ranked result with keyword, " +
            "country, position, url, domain, title, urlRating, backlinks, " +
            "referringDomains, organicTraffic. For the live Google " +
            "results page use mindcase#google/search; for links pointing " +
            "at a domain use mindcase#web/backlinks. $0.026 per ranked " +
            "result; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ahrefs/serp-overview",
        categories: ["seo"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/ahrefs/serp-overview",
    request: { method: "POST", path: "/v1/data/ahrefs/serp-overview/run" },
    input: {
        schema: {
            body: zAhrefsSerpOverviewBody.extend({
                maxResults: zAhrefsSerpOverviewBody.shape.maxResults.unwrap()
                    .min(1).default(10).describe(
                        "How many ranked results to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.026 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
