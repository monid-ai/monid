import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanyPathParams } from "../../schema/common.ts";

/** GET /v1/company/enrichment/partnerships/{company} — the full partner
 *  list. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Company Partnerships",
        summary: "A company's partners and strategic relationships.",
        description: "List a company's partnerships and strategic " +
            "relationships by website or Akta uuid: partner name and uuid, " +
            "partnership type, strategic tier, announcement date, " +
            "description, and source links where available. Use it to map " +
            "technology integrations, channel relationships, and " +
            "go-to-market alliances.",
        docsUrl:
            "https://agent-docs.akta.pro/api-reference/company-data-partnerships",
        categories: ["company-enrichment"],
    },
    request: {
        method: "GET",
        path: "/v1/company/enrichment/partnerships/{company}/",
    },
    input: { schema: { pathParams: zCompanyPathParams } },
    usage: {
        /** Flat 0.5 credits (agent-docs pricing, "Company partnership"). */
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.5 },
        },
    },
});
