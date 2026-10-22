import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    PERSON_IDENTIFIER_NOTE,
    zPersonEnrichBody,
} from "../../schema/person.ts";

/** POST /person/enrich under the Person Premium (No PII) key — the key selects the product (design D1). */
export default defineEndpoint({
    meta: {
        displayName: "Person Premium (No PII)",
        summary: "Person profile plus seniority, job function, " +
            "decision-maker status, experience, tenure, certifications and " +
            "freshness indicators. Choose for professional qualification " +
            "without contact or demographic (PII) fields.",
        description: "Professional qualification and analysis using Base " +
            "profile fields plus Premium attributes: seniority, job " +
            "function, decision-maker and platform-worker flags, expense " +
            "category, years of experience, tenure, highest degree, " +
            "certifications, LinkedIn audience counts and freshness " +
            "indicators. Excludes the contact/demographic (PII) field " +
            "group: emails, phones, personal location, age and sex. The " +
            "same person identifier works on every person product: when " +
            "basic professional fields suffice use the cheaper " +
            "/person/enrich/base/no-pii; to add contact or demographic " +
            "fields use /person/enrich/premium/pii; for PII with only " +
            "basic professional fields use /person/enrich/base/pii.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/person-enrichment",
        categories: ["people-enrichment"],
        notes: [PERSON_IDENTIFIER_NOTE],
    },
    // the four person products share one wire path, so the id carries the
    // v1 product suffix
    endpoint: "/person/enrich/premium/no-pii",
    request: { method: "POST", path: "/person/enrich" },
    auth: {
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                "API-Key": data.params.personPremiumNoPiiApiKey,
            },
        }),
    },
    input: { schema: { body: zPersonEnrichBody } },
    usage: {
        /** One credit per successful call from this product's own pool
         *  (design D2). Estimate and evidence are compiler-synthesized
         *  (flat model). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "match",
            consumes: { credit: "person_premium_no_pii", amount: 1 },
        },
    },
});
