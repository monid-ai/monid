import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEmailVerifyBody } from "./schema/inputs.ts";

/**
 * Mindcase `email/verify`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Email Verification",
        summary:
            "Check whether email addresses can receive mail. One row per " +
            "address: deliverable, undeliverable or unknown, a separate " +
            "catch-all flag, a plain-English...",
        description:
            "Check whether email addresses can receive mail. One row per " +
            "address: deliverable, undeliverable or unknown, a separate " +
            "catch-all flag, a plain-English reason and the checks behind " +
            "it. Returns one row per email with email, status, score, " +
            "reason, syntaxValid, domainExists, mxFound, smtpAccepted, " +
            "isCatchAll, isDisposable, isFreeEmailService, mxRecords. To " +
            "find addresses rather than check them use " +
            "mindcase#people/professional-email; for every address at a " +
            "domain use mindcase#companies/emails. $0.005 per email; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/email/verify",
        categories: ["people-enrichment"],
    },
    endpoint: "/email/verify",
    request: { method: "POST", path: "/v1/data/email/verify/run" },
    input: {
        schema: {
            body: zEmailVerifyBody,
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
            const capped = body.emails.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
