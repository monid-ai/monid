import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    PERSON_IDENTIFIER_NOTE,
    zPersonEnrichBody,
} from "../../schema/person.ts";

/** POST /person/enrich under the Person Premium (PII) key — the key selects the product (design D1). */
export default defineEndpoint({
    meta: {
        displayName: "Person Premium (PII)",
        summary: "Person profile with both Premium professional attributes " +
            "and contact/demographic (PII) fields. Choose when you need " +
            "seniority, decision-maker status, experience or tenure " +
            "together with emails, phones or location.",
        description: "Professional qualification and contact enrichment " +
            "using Base profile fields, Premium professional attributes " +
            "and contact/demographic (PII) fields. Premium attributes " +
            "include seniority, job function, decision-maker and " +
            "platform-worker flags, expense category, years of " +
            "experience, tenure, highest degree, certifications, LinkedIn " +
            "audience counts and freshness indicators. PII fields include " +
            "emails, phones, personal location, age and sex. The same " +
            "person identifier works on every person product: when PII is " +
            "unnecessary use the cheaper /person/enrich/premium/no-pii; " +
            "when Premium attributes are unnecessary use " +
            "/person/enrich/base/pii; when neither is needed use the " +
            "cheapest, /person/enrich/base/no-pii.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/person-enrichment",
        categories: ["people-enrichment"],
        notes: [PERSON_IDENTIFIER_NOTE],
    },
    // the four person products share one wire path, so the id carries the
    // v1 product suffix
    endpoint: "/person/enrich/premium/pii",
    request: { method: "POST", path: "/person/enrich" },
    auth: {
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                "API-Key": data.params.personPremiumPiiApiKey,
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
            consumes: { credit: "person_premium_pii", amount: 1 },
        },
    },
});
