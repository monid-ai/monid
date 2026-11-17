import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinDomainLookupBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/domain-lookup`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Domain name to Linkedin URL",
        summary: "Turn a company's website domain into its LinkedIn company " +
            "page URL.",
        description:
            "Turn a company's website domain into its LinkedIn company " +
            "page URL. Returns one row per result with domain, " +
            "linkedinUrl. For the full company record use " +
            "mindcase#linkedin/companies with the returned URL. $0.004 " +
            "per result; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/domain-lookup",
        categories: ["linkedin", "company-enrichment"],
        notes: [
            "Bills one row per input looked up; `maxResults` (optional) " +
            "only stops the run early.",
        ],
    },
    endpoint: "/linkedin/domain-lookup",
    request: { method: "POST", path: "/v1/data/linkedin/domain-lookup/run" },
    input: {
        schema: {
            body: zLinkedinDomainLookupBody.extend({
                maxResults: zLinkedinDomainLookupBody.shape.maxResults.unwrap()
                    .min(1).optional().describe(
                        "Stop after this many LinkedIn URLs have been found. Domains are looked up until the cap is met, so a domain that does not resolve does not use it up.",
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
            const rows = Math.min(body.maxResults ?? Infinity, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
