import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanyPathParams } from "../../schema/common.ts";

/** GET /v1/company/enrichment/swot/{company} — SWOT-style assessment. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Company SWOT",
        summary: "A company's strengths, weaknesses, risks, and highlights.",
        description: "Get a concise SWOT-style assessment of a company by " +
            "website or Akta uuid: strengths, weaknesses, key risks, and " +
            "key highlights, derived from Akta's broader company " +
            "assessment. Use it for a fast strategic read on a company.",
        docsUrl: "https://agent-docs.akta.pro/api-reference/company-data-swot",
        categories: ["company-enrichment"],
    },
    request: {
        method: "GET",
        path: "/v1/company/enrichment/swot/{company}/",
    },
    input: { schema: { pathParams: zCompanyPathParams } },
    usage: {
        /** Flat 0.5 credits (agent-docs pricing, "Company SWOT
         *  analysis"). */
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.5 },
        },
    },
});
