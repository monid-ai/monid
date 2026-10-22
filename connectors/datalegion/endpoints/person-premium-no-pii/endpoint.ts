import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { zPersonEnrichBody } from "../../schema/person.ts";

/** POST /person/enrich as the `person/enrich/premium/no-pii` product: the tier is a field filter. `toRequest` adds this product's excluded TOP-LEVEL fields to the caller's `exclude_fields` (the vendor applies it after `include_fields`), so excluded contact data never leaves Data Legion; `fromResponse` then drops the excluded fields again, including the NESTED Premium subfields a top-level filter cannot name. */
export default defineEndpoint({
    meta: {
        displayName: "Data Legion Person Premium",
        summary: "A person's profile with Premium professional attributes, " +
            "without contact or demographic fields.",
        description:
            "Enrich a person with the Base professional profile plus " +
            "Premium attributes: seniority, job function, decision-maker " +
            "and platform-worker flags, expense category, years of " +
            "experience, tenure, highest degree, certifications, LinkedIn " +
            "audience counts, and freshness indicators. Excludes the " +
            "contact and demographic (PII) fields: emails, phones, personal " +
            "location, age, and sex. Fields vary by matched record.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/person-enrichment",
        categories: ["people-enrichment"],
        notes: [
            "Billed 1 credit per returned record; a lookup with no match " +
            "(HTTP 404) is free.",
        ],
    },
    endpoint: "/person/enrich/premium/no-pii",
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
