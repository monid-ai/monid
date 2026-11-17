import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompaniesEmailsBody } from "./schema/inputs.ts";

/**
 * Mindcase `companies/emails`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Company Work Emails",
        summary: "Finds work email addresses at a company domain, with name, " +
            "title, department, seniority, confidence and sources " +
            "wherever they are known.",
        description:
            "Finds work email addresses at a company domain, with name, " +
            "title, department, seniority, confidence and sources " +
            "wherever they are known. Returns one row per people email " +
            "with email, domain, fullName, firstName, lastName, jobTitle, " +
            "department, seniority, decisionMaker, linkedinUrl, " +
            "twitterHandle, phoneNumber, confidence, emailSource, " +
            "verificationStatus, verificationDate, sourceCount, sources. " +
            "For one named person's email use " +
            "mindcase#people/professional-email; for the generic " +
            "addresses a site publishes (info@, press@) use " +
            "mindcase#email/role; to check addresses you already have use " +
            "mindcase#email/verify. $0.005 per people email; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/companies/emails",
        categories: ["company-enrichment", "people-enrichment"],
        notes: [
            "`maxResults` caps rows per input, so a run can return up to " +
            "that many rows for each `domains` entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/companies/emails",
    request: { method: "POST", path: "/v1/data/companies/emails/run" },
    input: {
        schema: {
            body: zCompaniesEmailsBody.extend({
                maxResults: zCompaniesEmailsBody.shape.maxResults.unwrap().min(
                    1,
                ).default(10).describe(
                    "Most people emails to return from each domain.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.domains.length;
            const rows = body.maxResults * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
