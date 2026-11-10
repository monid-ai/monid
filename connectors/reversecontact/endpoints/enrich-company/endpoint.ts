import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEnrichCompanyBody } from "./schema/inputs.ts";

/** POST /v2/enrich/companies: resolve a company from its website domain,
 *  then return its profile. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Company",
        summary: "Turn a website domain into the company's profile and " +
            "firmographics.",
        description: "Resolve the company behind a website domain and " +
            "return its profile: name, description, industry, " +
            "specialities, headcount and headcount range, headquarters and " +
            "locations, founding year, website, logo and its LinkedIn " +
            "page URL. Built for account research, lead routing by size " +
            "or industry, and CRM enrichment from an email's domain. " +
            "`data.company` holds the profile; its `id` filters people by " +
            "employer in `reversecontact#v2/search/people` " +
            "(`currentCompanyId`). No match answers 404 and costs " +
            "nothing. 2 credits per resolved company.",
        docsUrl: "https://docs.reversecontact.com/endpoints/enrich-company",
        categories: ["company-enrichment"],
        notes: [
            "A URL or `www.` form of the domain is normalized upstream; " +
            "disposable email domains are refused with 422, free.",
        ],
    },
    request: { method: "POST", path: "/v2/enrich/companies" },
    input: { schema: { body: zEnrichCompanyBody } },
    timeouts: { requestMs: 45_000, runMs: 50_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "resolved company",
            description: "Reverse Contact credits as the receipt reports " +
                "them: 2 per resolved company, 0 on no match",
        },
        estimate: () => ({ counts: { CREDIT: 2 } }),
    },
});
