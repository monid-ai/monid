import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    PERSON_IDENTIFIER_NOTE,
    zPersonEnrichBody,
} from "../../schema/person.ts";

/** POST /person/enrich under the Person Base (No PII) key — the key selects the product (design D1). */
export default defineEndpoint({
    meta: {
        displayName: "Person Base (No PII)",
        summary: "Basic person profile: current job, company, work " +
            "history, education and skills. Choose for professional " +
            "profile enrichment without contact or demographic (PII) " +
            "fields.",
        description: "Basic professional profile enrichment with name, " +
            "headline, profile summary, current job and company, work " +
            "history, education, skills, languages and social profiles. " +
            "Excludes Premium professional attributes and the " +
            "contact/demographic (PII) field group: emails, phones, " +
            "personal location, age and sex. The same person identifier " +
            "works on every person product: for contact or demographic " +
            "fields use /person/enrich/base/pii; for seniority, job " +
            "function, experience and tenure without PII use " +
            "/person/enrich/premium/no-pii; for both use " +
            "/person/enrich/premium/pii.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/person-enrichment",
        categories: ["people-enrichment"],
        notes: [PERSON_IDENTIFIER_NOTE],
    },
    // the four person products share one wire path, so the id carries the
    // v1 product suffix
    endpoint: "/person/enrich/base/no-pii",
    request: { method: "POST", path: "/person/enrich" },
    auth: {
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                "API-Key": data.params.personBaseNoPiiApiKey,
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
            consumes: { credit: "person_base_no_pii", amount: 1 },
        },
    },
});
