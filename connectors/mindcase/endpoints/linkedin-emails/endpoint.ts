import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinEmailsBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/emails`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Email",
        summary: "Turn a LinkedIn profile URL into the person's current work " +
            "email, at their current employer only. No login, no " +
            "connection request.",
        description:
            "Turn a LinkedIn profile URL into the person's current work " +
            "email, at their current employer only. No login, no " +
            "connection request. Returns one row per email with " +
            "profileUrl, email. For the full profile behind the email use " +
            "mindcase#linkedin/profiles. $0.025 per email; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/emails",
        categories: ["linkedin", "people-enrichment"],
    },
    endpoint: "/linkedin/emails",
    request: { method: "POST", path: "/v1/data/linkedin/emails/run" },
    input: {
        schema: {
            body: zLinkedinEmailsBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.urls.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
