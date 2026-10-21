import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zHeadcountTrendsQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/headcount-trends — LinkedIn-sourced workforce data. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Headcount Trends",
        summary: "A company's employee count and growth by department.",
        description: "Get a company's LinkedIn-sourced headcount by " +
            "website or Akta uuid: current employees, monthly historical " +
            "headcount, 6/12/24-month growth, and department-level " +
            "headcount with 6/12-month growth. Use it for workforce " +
            "momentum, functional expansion or contraction, and hiring " +
            "signals.",
        docsUrl:
            "https://agent-docs.akta.pro/api-reference/alternative-data/headcount-trends",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/v1/company/headcount-trends/" },
    input: { schema: { queryParams: zHeadcountTrendsQueryParams } },
    usage: {
        /** Flat 2.5 credits (agent-docs pricing, "Headcount Trends"). */
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 2.5 },
        },
    },
});
