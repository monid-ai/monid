import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPeoplePhoneLookupBody } from "./schema/inputs.ts";

/**
 * Mindcase `people/phone-lookup`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Phone Number Lookup",
        summary:
            "Find a person's phone number from a LinkedIn URL, a name and " +
            "company, or an email address. Numbers come back in " +
            "international format with their line type.",
        description:
            "Find a person's phone number from a LinkedIn URL, a name and " +
            "company, or an email address. Numbers come back in " +
            "international format with their line type. Returns one row " +
            "per phone number with profileUrl, fullName, title, company, " +
            "companyDomain, phone, phoneType, input. Call it by linkedin " +
            "url (linkedinUrls), name and company (people) or email " +
            "(emails). For a work email use " +
            "mindcase#people/professional-email; for a personal email use " +
            "mindcase#people/personal-email; for the full career profile " +
            "use mindcase#people/enrichment. $0.35 per phone number; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/people/phone-lookup",
        categories: ["people-enrichment"],
        notes: [
            "The legacy single-person inputs (`companyOrDomain`, " +
            "`fullName`) are not exposed here; use the list inputs " +
            "instead.",
        ],
    },
    endpoint: "/people/phone-lookup",
    request: { method: "POST", path: "/v1/data/people/phone-lookup/run" },
    input: {
        schema: {
            body: zPeoplePhoneLookupBody.omit({
                companyOrDomain: true,
                fullName: true,
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.35 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = (body.linkedinUrls?.length ?? 0) +
                (body.people?.length ?? 0) + (body.emails?.length ?? 0);
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
