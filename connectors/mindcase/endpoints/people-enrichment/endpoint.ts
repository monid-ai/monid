import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPeopleEnrichmentBody } from "./schema/inputs.ts";

/**
 * Mindcase `people/enrichment`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "People Enrichment",
        summary: "Enriches a known person into a full profile with current " +
            "role, seniority, location, employment history and employer " +
            "firmographics.",
        description:
            "Enriches a known person into a full profile with current " +
            "role, seniority, location, employment history and employer " +
            "firmographics. Returns one row per profile with profileUrl, " +
            "firstName, lastName, headline, jobTitle, seniority, " +
            "departments, subdepartments, functions, city, state, " +
            "country, photo, twitterUrl, githubUrl, facebookUrl, " +
            "companyName, companyDomain, company, experience. Call it by " +
            "linkedin url (linkedinUrls), work email (emails) or name and " +
            "company (people). For a work email use " +
            "mindcase#people/professional-email; for a personal email use " +
            "mindcase#people/personal-email; for a phone number use " +
            "mindcase#people/phone-lookup. $0.052 per profile; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/people/enrichment",
        categories: ["people-enrichment"],
        notes: [
            "The legacy single-person inputs (`companyName`, `firstName`, " +
            "`lastName`) are not exposed here; use the list inputs " +
            "instead.",
        ],
    },
    endpoint: "/people/enrichment",
    request: { method: "POST", path: "/v1/data/people/enrichment/run" },
    input: {
        schema: {
            body: zPeopleEnrichmentBody.omit({
                companyName: true,
                firstName: true,
                lastName: true,
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.052 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = (body.linkedinUrls?.length ?? 0) +
                (body.emails?.length ?? 0) + (body.people?.length ?? 0);
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
