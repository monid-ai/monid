import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanyPathParams } from "../../schema/common.ts";

/** GET /v1/company/enrichment/peers/{company} — the curated peer set. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Company Peers",
        summary: "A company's direct peers, competitors, and incumbents.",
        description: "Get a curated peer set for a company by website or " +
            "Akta uuid: peer names, Akta uuids, descriptions, and peer types " +
            "such as direct peers and broad incumbents. Use it to build a " +
            "comparable-company set, identify competitors, or seed " +
            "lookalike analysis and market maps.",
        docsUrl: "https://agent-docs.akta.pro/api-reference/company-data-peers",
        categories: ["company-enrichment"],
    },
    request: {
        method: "GET",
        path: "/v1/company/enrichment/peers/{company}/",
    },
    input: { schema: { pathParams: zCompanyPathParams } },
    usage: {
        /** Flat 0.5 credits (agent-docs pricing, "Company peers"). */
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.5 },
        },
    },
});
