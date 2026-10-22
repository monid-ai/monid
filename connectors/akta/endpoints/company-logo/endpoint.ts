import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanyPathParams } from "../../schema/common.ts";

/** GET /v1/company/enrichment/logo/{company} — hosted logo URL, free. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Company Logo",
        summary: "A company's hosted logo URL. Free.",
        description: "Get the hosted logo image URL for a company by " +
            "website or Akta uuid, without retrieving any other company " +
            "data. Free — consumes no credits.",
        docsUrl: "https://agent-docs.akta.pro/api-reference/company-data-logo",
        categories: ["company-enrichment"],
    },
    request: {
        method: "GET",
        path: "/v1/company/enrichment/logo/{company}/",
    },
    input: { schema: { pathParams: zCompanyPathParams } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
