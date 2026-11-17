import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSimilarwebSimilarSitesBody } from "./schema/inputs.ts";

/**
 * Mindcase `similarweb/similar-sites`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Similarweb Similar Sites",
        summary:
            "Sites similar to a domain according to Similarweb: up to 10 " +
            "per domain, best match first, with rank, affinity, category " +
            "and category rank. Pass the domains.",
        description:
            "Sites similar to a domain according to Similarweb: up to 10 " +
            "per domain, best match first, with rank, affinity, category " +
            "and category rank. Pass the domains. Returns one row per " +
            "site with sourceDomain, domain, rank, affinity, category, " +
            "categoryRank, snapshotMonth. For the traffic numbers of a " +
            "site use mindcase#similarweb/traffic. $0.004 per site; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/similarweb/similar-sites",
        categories: ["web-traffic"],
        notes: [
            "`maxResults` caps rows per input, so a run can return up to " +
            "that many rows for each `domains` entry.",
        ],
    },
    endpoint: "/similarweb/similar-sites",
    request: { method: "POST", path: "/v1/data/similarweb/similar-sites/run" },
    input: {
        schema: {
            body: zSimilarwebSimilarSitesBody.extend({
                maxResults: zSimilarwebSimilarSitesBody.shape.maxResults
                    .unwrap().min(1).default(10).describe(
                        "How many similar sites to return per domain, best match first. Similarweb lists up to 10 per domain; defaults to 10 (all of them).",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.004 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.domains.length;
            const rows = body.maxResults * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
