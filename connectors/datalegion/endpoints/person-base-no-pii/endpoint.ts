import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { zPersonEnrichBody } from "../../schema/person.ts";

/** POST /person/enrich as the `person/enrich/base/no-pii` product: the tier is a field filter. `toRequest` adds this product's excluded TOP-LEVEL fields to the caller's `exclude_fields` (the vendor applies it after `include_fields`), so excluded contact data never leaves Data Legion; `fromResponse` then drops the excluded fields again, including the NESTED Premium subfields a top-level filter cannot name. */
export default defineEndpoint({
    meta: {
        displayName: "Data Legion Person Base",
        summary: "A person's professional profile, without contact or " +
            "demographic fields.",
        description:
            "Enrich a person with name, headline, profile summary, current " +
            "job and company, work history, education, skills, languages, " +
            "and social profiles. Excludes Premium professional attributes " +
            "and the contact and demographic (PII) fields: emails, phones, " +
            "personal location, age, and sex. Fields vary by matched " +
            "record.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/person-enrichment",
        categories: ["people-enrichment"],
        notes: [
            "Billed 1 credit per returned record; a lookup with no match " +
            "(HTTP 404) is free.",
        ],
    },
    endpoint: "/person/enrich/base/no-pii",
    request: { method: "POST", path: "/person/enrich" },
    input: {
        schema: { body: zPersonEnrichBody },
        toRequest: ({ data }) => {
            const body = data.input.body as Record<string, Json>;
            const tierExcluded = [
                "sex",
                "birth_date",
                "birth_year",
                "birth_month",
                "birth_day",
                "age",
                "work_email",
                "mobile_phone",
                "phones",
                "emails",
                "city",
                "state",
                "state_code",
                "country",
                "country_code",
                "locations",
                "seniority_level",
                "job_function",
                "expense_category",
                "is_decision_maker",
                "is_platform_worker",
                "years_of_experience",
                "avg_tenure_months",
                "highest_degree_level",
                "linkedin_followers",
                "linkedin_connections",
                "certifications",
                "num_sources",
                "last_seen",
                "current_jobs_last_confirmed",
                "current_jobs_last_updated",
                "current_location_last_confirmed",
                "current_location_last_updated",
            ];
            const callerExcluded = typeof body.exclude_fields === "string"
                ? body.exclude_fields.split(",").map((field) => field.trim())
                    .filter((field) => field.length > 0)
                : [];
            const excluded = callerExcluded.concat(
                tierExcluded.filter((field) => !callerExcluded.includes(field)),
            );
            return {
                ...data.input,
                body: { ...body, exclude_fields: excluded.join(",") },
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "records",
            consumes: { credit: "person", amount: 1 },
        },
    },
    output: {
        /** Paths are relative to one match; `[]` walks an array. */
        fromResponse: ({ data }) => {
            const output = JSON.parse(JSON.stringify(data.output));
            const dropped = [
                "sex",
                "birth_date",
                "birth_year",
                "birth_month",
                "birth_day",
                "age",
                "work_email",
                "mobile_phone",
                "phones",
                "emails",
                "city",
                "state",
                "state_code",
                "country",
                "country_code",
                "locations",
                "seniority_level",
                "job_function",
                "expense_category",
                "is_decision_maker",
                "is_platform_worker",
                "years_of_experience",
                "avg_tenure_months",
                "highest_degree_level",
                "linkedin_followers",
                "linkedin_connections",
                "certifications",
                "num_sources",
                "last_seen",
                "current_jobs_last_confirmed",
                "current_jobs_last_updated",
                "current_location_last_confirmed",
                "current_location_last_updated",
                "headline.raw",
                "summary.raw",
                "skills[].raw",
                "languages[].raw",
                "phones[].last_seen",
                "phones[].num_sources",
                "phones[].confidence",
                "emails[].last_seen",
                "emails[].validated",
                "emails[].validation_status",
                "emails[].num_sources",
                "emails[].confidence",
                "emails[].hash_sha256",
                "emails[].hash_sha1",
                "emails[].hash_md5",
                "locations[].geo",
                "locations[].raw",
                "locations[].num_sources",
                "locations[].confidence",
                "locations[].last_seen",
                "experience[].title.raw",
                "experience[].seniority_level",
                "experience[].job_function",
                "experience[].expense_category",
                "experience[].is_decision_maker",
                "experience[].is_platform_worker",
                "experience[].organization.name.raw",
                "experience[].description.raw",
                "education[].organization.name.raw",
                "education[].degree.raw",
                "education[].degree_level",
                "education[].field_of_study.raw",
                "socials[].num_sources",
                "socials[].confidence",
                "socials[].last_seen",
            ];
            const matches = Array.isArray(output?.matches)
                ? output.matches
                : [];
            for (const path of dropped) {
                const segments = path.split(".");
                let nodes = matches.filter((match: unknown) =>
                    match !== null && typeof match === "object"
                );
                for (const segment of segments.slice(0, -1)) {
                    const walksArray = segment.endsWith("[]");
                    const name = walksArray ? segment.slice(0, -2) : segment;
                    nodes = nodes.flatMap((node: Record<string, unknown>) => {
                        const child = node[name];
                        if (walksArray) {
                            return Array.isArray(child)
                                ? child.filter((item) =>
                                    item !== null && typeof item === "object"
                                )
                                : [];
                        }
                        return child !== null && typeof child === "object" &&
                                !Array.isArray(child)
                            ? [child]
                            : [];
                    });
                }
                const last = segments[segments.length - 1];
                const field = last.endsWith("[]") ? last.slice(0, -2) : last;
                for (const node of nodes) delete node[field];
            }
            return output;
        },
    },
});
