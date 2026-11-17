import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinCompanyEmployeesBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/company-employees`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Company Employees",
        summary: "List LinkedIn company employees (name, role, location, " +
            "seniority) from a list of company URLs.",
        description: "List LinkedIn company employees (name, role, location, " +
            "seniority) from a list of company URLs. Returns one row per " +
            "profile with profileUrl, profileId, handle, firstName, " +
            "lastName, headline, about, photo, coverPhoto, city, state, " +
            "country, followers, connections, verified, premium, " +
            "influencer, openToWork, hiring, experience, education, " +
            "certifications, projects, courses, publications, " +
            "volunteering, receivedRecommendations, skills, patents, " +
            "honorsAndAwards and 2 more fields. For full profiles from " +
            "URLs you already have use mindcase#linkedin/profiles; for " +
            "people search across companies use " +
            "mindcase#linkedin/profiles/search. $0.004 per profile plus a " +
            "flat $0.05 search fee per run, charged even when nothing is " +
            "found.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/company-employees",
        categories: ["linkedin", "people-enrichment"],
        notes: [
            "Adds a flat $0.05 search fee to every run, including runs " +
            "that find nothing.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/linkedin/company-employees",
    request: {
        method: "POST",
        path: "/v1/data/linkedin/company-employees/run",
    },
    input: {
        schema: {
            body: zLinkedinCompanyEmployeesBody.extend({
                maxResults: zLinkedinCompanyEmployeesBody.shape.maxResults
                    .unwrap().min(1).describe(
                        "Number of employee profiles to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                row: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "profiles",
                    description: "profiles returned",
                    consumes: { credit: "default", amount: 0.004 },
                },
                search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search fee",
                    description:
                        "one flat fee per run, charged even when nothing is found",
                    consumes: { credit: "default", amount: 0.05 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { row: rows, search: 1 } };
        },
        evidence: ({ data, utils }) => {
            const input = (data.input.body ?? {}) as Record<string, unknown>;
            // deno-lint-ignore no-explicit-any
            const body = (input.params ?? input) as any;
            const delivered = utils.json.optionalLen(data.output, "$.data") ??
                0;
            return { counts: { row: delivered, search: 1 } };
        },
    },
});
