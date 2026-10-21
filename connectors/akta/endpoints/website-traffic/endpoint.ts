import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zWebsiteTrafficQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/website-traffic — visits, engagement, and sources. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Website Traffic",
        summary: "A company website's visits, engagement, and traffic sources.",
        description: "Get a company's website traffic by website or Akta " +
            "uuid: estimated monthly visits with history, bounce rate, " +
            "pages per visit, time on site, and traffic share across " +
            "direct, search, social, referrals, email, display, affiliate, " +
            "and generative-AI sources. Use it for demand, marketing-mix, " +
            "and web-momentum signals.",
        docsUrl:
            "https://agent-docs.akta.pro/api-reference/alternative-data/website-traffic",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/v1/company/website-traffic/" },
    input: { schema: { queryParams: zWebsiteTrafficQueryParams } },
    usage: {
        /** Flat 1.5 credits (agent-docs pricing, "Web Traffic"). */
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 1.5 },
        },
    },
});
