import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zConciseQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/enrichment/concise — every section, condensed, flat. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Company Enrichment (Concise)",
        summary: "A condensed all-section company profile at a flat price.",
        description: "Get a compact company snapshot by website or Akta " +
            "uuid in one call: what the company does, founded year, HQ and " +
            "offices, headcount band, industries, business model, " +
            "executives, competitors, strengths and risks, subsidiaries, " +
            "partnerships, named customers, revenue and valuation bands, " +
            "and technology. Covers every section of the detailed Company " +
            "Enrichment endpoint, pre-condensed to the most useful fields; " +
            "there is no section selection. Use the detailed endpoint when " +
            "you need full depth on a few sections.",
        docsUrl:
            "https://agent-docs.akta.pro/api-reference/company-data-concise",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/v1/company/enrichment/concise/" },
    input: { schema: { queryParams: zConciseQueryParams } },
    usage: {
        /** Flat 3 credits per run (agent-docs pricing, "Company Data
         *  (Concise)"). Settle is inherited: the provider consolidate lifts
         *  `credits_consumed` as the vendor's claim. */
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 3 },
        },
    },
});
