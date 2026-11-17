import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPeoplePersonalEmailBody } from "./schema/inputs.ts";

/**
 * Mindcase `people/personal-email`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Personal Email Lookup",
        summary:
            "Find a person's personal email address from a LinkedIn URL, " +
            "or from a name and company. Every address is checked to be a " +
            "real, working mailbox.",
        description:
            "Find a person's personal email address from a LinkedIn URL, " +
            "or from a name and company. Every address is checked to be a " +
            "real, working mailbox. Returns one row per email with input, " +
            "profileUrl, fullName, personalEmail, mailboxStatus. Call it " +
            "by linkedin url (linkedinUrls) or name and company (people). " +
            "For a current work email use " +
            "mindcase#people/professional-email; for a phone number use " +
            "mindcase#people/phone-lookup; for the full career profile " +
            "use mindcase#people/enrichment. $0.2 per email; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/people/personal-email",
        categories: ["people-enrichment"],
    },
    endpoint: "/people/personal-email",
    request: { method: "POST", path: "/v1/data/people/personal-email/run" },
    input: {
        schema: {
            body: zPeoplePersonalEmailBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.2 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = (body.linkedinUrls?.length ?? 0) +
                (body.people?.length ?? 0);
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
