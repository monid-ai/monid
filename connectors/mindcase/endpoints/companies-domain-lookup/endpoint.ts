import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompaniesDomainLookupBody } from "./schema/inputs.ts";

/**
 * Mindcase `companies/domain-lookup`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Company Domain Lookup",
        summary: "Resolves company names into their most likely domain names " +
            "with ranked suggestions.",
        description:
            "Resolves company names into their most likely domain names " +
            "with ranked suggestions. Returns one row per domain " +
            "suggestion with query, domain, companyName, emailCount. For " +
            "the full company profile once you have the domain use " +
            "mindcase#companies/enrichment; for the LinkedIn page from a " +
            "domain use mindcase#linkedin/domain-lookup. $0.001 per " +
            "domain suggestion; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/companies/domain-lookup",
        categories: ["company-enrichment"],
        notes: [
            "`limit` caps rows per input, so a run can return up to that " +
            "many rows for each `companyNames` entry.",
            "`limit` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/companies/domain-lookup",
    request: { method: "POST", path: "/v1/data/companies/domain-lookup/run" },
    input: {
        schema: {
            body: zCompaniesDomainLookupBody.extend({
                limit: zCompaniesDomainLookupBody.shape.limit.unwrap().min(1)
                    .default(5).describe(
                        "Most domain suggestions to return for each company name.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.companyNames.length;
            const rows = body.limit * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
