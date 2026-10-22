import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    PERSON_IDENTIFIER_NOTE,
    zPersonEnrichBody,
} from "../../schema/person.ts";

/** POST /person/enrich under the Person Base (PII) key — the key selects the product (design D1). */
export default defineEndpoint({
    meta: {
        displayName: "Person Base (PII)",
        summary: "Basic person profile with contact and demographic (PII) " +
            "fields, including emails, phones, location, age and sex. " +
            "Choose for contact enrichment without Premium professional " +
            "attributes.",
        description: "Basic professional profile enrichment with name, " +
            "headline, profile summary, current job and company, work " +
            "history, education, skills, languages and social profiles, " +
            "plus contact/demographic (PII) fields: emails, phones, " +
            "personal location, age and sex. PII access does not include " +
            "Premium professional attributes. The same person identifier " +
            "works on every person product: when PII is unnecessary use " +
            "the cheaper /person/enrich/base/no-pii; to add Premium " +
            "attributes while keeping PII use /person/enrich/premium/pii; " +
            "for Premium attributes without PII use " +
            "/person/enrich/premium/no-pii.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/person-enrichment",
        categories: ["people-enrichment"],
        notes: [PERSON_IDENTIFIER_NOTE],
    },
    // the four person products share one wire path, so the id carries the
    // v1 product suffix
    endpoint: "/person/enrich/base/pii",
    request: { method: "POST", path: "/person/enrich" },
    auth: {
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                "API-Key": data.params.personBasePiiApiKey,
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
            consumes: { credit: "person_base_pii", amount: 1 },
        },
    },
});
