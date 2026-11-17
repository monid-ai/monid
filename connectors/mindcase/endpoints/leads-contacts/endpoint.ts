import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLeadsContactsBody } from "./schema/inputs.ts";

/**
 * Mindcase `leads/contacts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Website Phones, Emails and Socials",
        summary:
            "Get the phone numbers, emails and social profiles a company " +
            "publishes on its own website. One row per website with the " +
            "main email and phone, every email and...",
        description:
            "Get the phone numbers, emails and social profiles a company " +
            "publishes on its own website. One row per website with the " +
            "main email and phone, every email and phone found with the " +
            "page it came from, social profiles, address and logo. " +
            "Returns one row per domain with website, inputUrl, domain, " +
            "businessName, description, email, phone, emails, phones, " +
            "socials, messaging, address, contactFormUrl, logo. For " +
            "emails only, with the page each was found on use " +
            "mindcase#email/role; for what the site says about the " +
            "company use mindcase#leads/company-research; for named " +
            "employees' emails use mindcase#companies/emails. $0.008 per " +
            "domain; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/leads/contacts",
        categories: ["people-enrichment"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/leads/contacts",
    request: { method: "POST", path: "/v1/data/leads/contacts/run" },
    input: {
        schema: {
            body: zLeadsContactsBody.extend({
                maxResults: zLeadsContactsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many websites to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.008 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
