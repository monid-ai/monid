import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPeopleProfessionalEmailBody } from "./schema/inputs.ts";

/**
 * Mindcase `people/professional-email`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Professional Email Lookup",
        summary: "Find a person's current professional email from a LinkedIn " +
            "URL, or from a name and company. Every address is checked as " +
            "deliverable before it is returned.",
        description:
            "Find a person's current professional email from a LinkedIn " +
            "URL, or from a name and company. Every address is checked as " +
            "deliverable before it is returned. Returns one row per email " +
            "with input, profileUrl, fullName, companyDomain, email, " +
            "emailStatus, catchAllDomain. Call it by linkedin url " +
            "(linkedinUrls) or name and company (people). For a personal " +
            "address instead use mindcase#people/personal-email; for a " +
            "phone number use mindcase#people/phone-lookup; for every " +
            "email at one company domain use mindcase#companies/emails. " +
            "$0.04 per email; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/people/professional-email",
        categories: ["people-enrichment"],
        notes: [
            "Rows found by `people` cost $0.05 each instead of $0.04.",
        ],
    },
    endpoint: "/people/professional-email",
    request: { method: "POST", path: "/v1/data/people/professional-email/run" },
    input: {
        schema: {
            body: zPeopleProfessionalEmailBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                row: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "emails",
                    description: "emails returned",
                    consumes: { credit: "default", amount: 0.04 },
                },
                row_name: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "emails",
                    description: "emails returned when searching by name",
                    consumes: { credit: "default", amount: 0.05 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = (body.linkedinUrls?.length ?? 0) +
                (body.people?.length ?? 0);
            const rows = capped;
            return {
                counts: {
                    row: Math.max(0, rows - (body.people?.length ?? 0)),
                    row_name: Math.min(rows, body.people?.length ?? 0),
                },
            };
        },
        evidence: ({ data, utils }) => {
            const input = (data.input.body ?? {}) as Record<string, unknown>;
            // deno-lint-ignore no-explicit-any
            const body = (input.params ?? input) as any;
            const delivered = utils.json.optionalLen(data.output, "$.data") ??
                0;
            return {
                counts: {
                    row: Math.max(0, delivered - (body.people?.length ?? 0)),
                    row_name: Math.min(delivered, body.people?.length ?? 0),
                },
            };
        },
    },
});
