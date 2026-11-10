import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEnrichPersonBody } from "./schema/inputs.ts";

/** POST /v2/enrich/persons: resolve a person from an email or a name and
 *  a company, then return the full profile. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person",
        summary: "Turn a work email, or a name and a company, into the " +
            "person's full professional profile.",
        description: "Resolve the person behind a work email, or behind " +
            "a name paired with their company domain or name, and return " +
            "their full professional profile: current position and " +
            "employer, the full work history, education, skills, " +
            "languages, location and their LinkedIn profile URL. Built " +
            "for lead and CRM enrichment, inbound qualification and " +
            "knowing who is behind a sign-up. The email path is the most " +
            "precise; a name alone rarely resolves, so pair it with " +
            "`companyDomain`. `data.person` holds the profile and " +
            "`data.isFullProfile` says whether the complete record was " +
            "available. No match answers 404 and costs nothing. 2 " +
            "credits per resolved person.",
        docsUrl: "https://docs.reversecontact.com/endpoints/enrich-person",
        categories: ["people-enrichment"],
        notes: [
            "Placeholder values (`test`, `N/A`, spreadsheet errors such as " +
            "`#N/A`, an email in a name field) and disposable email " +
            "domains are refused with 422 before any lookup, free.",
            "Resolution can take up to a minute on an uncached person.",
        ],
    },
    request: { method: "POST", path: "/v2/enrich/persons" },
    input: { schema: { body: zEnrichPersonBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "resolved person",
            description: "Reverse Contact credits as the receipt reports " +
                "them: 2 per resolved person, 0 on no match",
        },
        estimate: () => ({ counts: { CREDIT: 2 } }),
    },
});
