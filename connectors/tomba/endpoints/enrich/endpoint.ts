import { defineEndpoint } from "@shared/core";
import {
    finderModel,
    singleFinderEstimate,
    singleFinderEvidence,
} from "../../schema/finder.ts";
import { zEnrichQueryParams } from "./schema/inputs.ts";

/** GET /enrich — the person behind an email address, in Tomba's format. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Email",
        summary:
            "Get the person behind an email address: name, company, title, and social profiles.",
        description: "Look up the person behind an email address in " +
            "Tomba's own format: first and last name, company and its " +
            "domain, job title, department, country, gender, LinkedIn and " +
            "Twitter, a 0-100 score, the verification status, the public " +
            "pages the address was found on, and whether its domain is " +
            "webmail or disposable; optionally the person's phone numbers " +
            "with enrich_mobile. When Tomba has no data for the address the " +
            "response is a 200 with data.email null, free. Suited for " +
            "qualifying inbound leads and filling CRM records. For the " +
            "Clearbit-compatible format, use /people/find.",
        docsUrl: "https://docs.tomba.io/api/finder#email-enrichment",
        categories: ["people-enrichment"],
        notes: [
            "Charged 1 search credit (6 with phone data) only when an " +
            "address is returned with a verification status other than " +
            "`unknown`.",
        ],
    },
    request: { method: "GET", path: "/enrich" },
    input: {
        schema: {
            queryParams: zEnrichQueryParams.required({ email: true }),
        },
    },
    usage: {
        model: finderModel,
        estimate: singleFinderEstimate,
        evidence: singleFinderEvidence,
    },
});
