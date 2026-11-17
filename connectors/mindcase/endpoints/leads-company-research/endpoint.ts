import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLeadsCompanyResearchBody } from "./schema/inputs.ts";

/**
 * Mindcase `leads/company-research`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Company Website Metadata",
        summary:
            "Reads a company's own website and returns what the site says " +
            "about the company: name, legal name, description, logo, " +
            "founding date, address, social links...",
        description:
            "Reads a company's own website and returns what the site says " +
            "about the company: name, legal name, description, logo, " +
            "founding date, address, social links and the web " +
            "technologies it runs. Pass domains. Fields the site does not " +
            "publish come back blank. Returns one row per companie with " +
            "domain, companyName, legalName, description, website, logo, " +
            "foundingDate, address, country, phones, emails, socials, " +
            "profileLinks, technologies, language, contactPageUrl. For " +
            "firmographics, funding and headcount from data providers use " +
            "mindcase#companies/enrichment; for the site's phones and " +
            "emails use mindcase#leads/contacts. $0.01 per companie; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/leads/company-research",
        categories: ["company-enrichment"],
    },
    endpoint: "/leads/company-research",
    request: { method: "POST", path: "/v1/data/leads/company-research/run" },
    input: {
        schema: {
            body: zLeadsCompanyResearchBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.domains.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
