import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPersonEnrichBody } from "../../schema/person.ts";

/** POST /person/enrich as the `person/enrich/premium/pii` product: the vendor returns every field this product includes, so no filter is added. */
export default defineEndpoint({
    meta: {
        displayName: "Data Legion Person Premium with Contact Data",
        summary:
            "A person's full profile: Premium professional attributes plus " +
            "contact and demographic fields.",
        description:
            "Enrich a person with every field: the Base professional " +
            "profile, Premium attributes (seniority, job function, " +
            "decision-maker and platform-worker flags, expense category, " +
            "experience and tenure, highest degree, certifications, " +
            "LinkedIn audience counts, freshness), and contact and " +
            "demographic (PII) fields: emails, phones, personal location, " +
            "age, and sex. Fields vary by matched record.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/person-enrichment",
        categories: ["people-enrichment"],
        notes: [
            "Billed 1 credit per returned record; a lookup with no match " +
            "(HTTP 404) is free.",
        ],
    },
    endpoint: "/person/enrich/premium/pii",
    request: { method: "POST", path: "/person/enrich" },
    input: {
        schema: { body: zPersonEnrichBody },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "records",
            consumes: { credit: "person", amount: 1 },
        },
    },
});
