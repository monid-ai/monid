import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zVeilleEmailQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/intelligence/email — Check an email address for fraud signals and a risk score.
 *
 * Billing: 3 Veille credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Veille Email Check",
        summary: "Check an email address for fraud signals and a risk score.",
        description:
            "Check an email address without sending mail: syntax, MX and " +
            "SPF/DMARC records, disposable or temporary provider, role " +
            "account, alias, a typo suggestion (`did_you_mean`) and a 0-100 " +
            "`risk_score`.",
        docsUrl: "https://docs.veille.io",
        categories: ["people-enrichment"],
        notes: ["3 Veille credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/intelligence/email" },
    input: { schema: { queryParams: zVeilleEmailQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 3 },
        },
    },
});
