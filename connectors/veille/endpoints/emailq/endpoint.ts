import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zVeilleEmailqQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/intelligence/emailq — Verify an email address is deliverable, with an SMTP inbox test.
 *
 * Billing: 5 Veille credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Veille Email Verification",
        summary:
            "Verify an email address is deliverable, with an SMTP inbox test.",
        description:
            "Verify an email address with an SMTP inbox test and catch-all " +
            "detection, and get a verdict (valid, invalid, risky, disposable " +
            "or unknown) with a 0-100 risk score. Slower and pricier than " +
            "`veille#v1/intelligence/email`; use it when deliverability " +
            "matters.",
        docsUrl: "https://docs.veille.io",
        categories: ["people-enrichment"],
        notes: ["5 Veille credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/intelligence/emailq" },
    input: { schema: { queryParams: zVeilleEmailqQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 5 },
        },
    },
});
