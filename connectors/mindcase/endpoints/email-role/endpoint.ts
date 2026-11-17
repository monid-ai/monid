import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEmailRoleBody } from "./schema/inputs.ts";

/**
 * Mindcase `email/role`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Website Email Extractor",
        summary:
            "Finds every email address a company publishes on its website " +
            "(contact, press and team pages), with the page each was " +
            "found on.",
        description:
            "Finds every email address a company publishes on its website " +
            "(contact, press and team pages), with the page each was " +
            "found on. Returns one row per email with domain, email, " +
            "emailDomain, foundOn, foundAs, label, siteName, website. For " +
            "named people at the company use mindcase#companies/emails; " +
            "for phones and social links the site publishes use " +
            "mindcase#leads/contacts; to check deliverability use " +
            "mindcase#email/verify. $0.0095 per email; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/email/role",
        categories: ["people-enrichment"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/email/role",
    request: { method: "POST", path: "/v1/data/email/role/run" },
    input: {
        schema: {
            body: zEmailRoleBody.extend({
                maxResults: zEmailRoleBody.shape.maxResults.unwrap().min(1)
                    .default(50).describe(
                        "How many email addresses to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0095 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
