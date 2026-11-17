import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFetchCompanyBody } from "./schema/inputs.ts";

/** POST /v2/fetch/companies: one company's profile, from the cached
 *  database, by page URL or Reverse Contact id. */
export default defineEndpoint({
    meta: {
        displayName: "Fetch Company Profile",
        summary: "Read a company's profile from its LinkedIn page URL or " +
            "Reverse Contact id.",
        description: "Read one company's profile by LinkedIn company URL " +
            "or Reverse Contact id (`com_...`): name, tagline, " +
            "description, industry, specialities, headcount and headcount " +
            "range, follower count, website, phone, headquarters and " +
            "other locations, founding year and logo. Reach for it when " +
            "the page URL is already known: to start from a website " +
            "domain, use `reversecontact#v2/enrich/companies`. The `id` " +
            "it returns filters people by employer in " +
            "`reversecontact#v2/search/people` (`currentCompanyId`). A " +
            "company the database does not hold answers 404 and costs " +
            "nothing. 1 credit per company returned.",
        docsUrl: "https://docs.reversecontact.com/endpoints/fetch-company",
        categories: ["company-enrichment"],
        notes: [
            "An `id` that resolves to no company answers 422 " +
            "`VALIDATION_ERROR`, free.",
        ],
    },
    request: { method: "POST", path: "/v2/fetch/companies" },
    input: { schema: { body: zFetchCompanyBody } },
    timeouts: { requestMs: 35_000, runMs: 40_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "company",
            description: "Reverse Contact credits as the receipt reports " +
                "them: 1 per company returned",
        },
        estimate: () => ({ counts: { CREDIT: 1 } }),
    },
});
