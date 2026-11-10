import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zVeilleDomainQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/intelligence/domain — Check a domain's mail setup and whether it is disposable.
 *
 * Billing: 2 Veille credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Veille Domain Check",
        summary: "Check a domain's mail setup and whether it is disposable.",
        description:
            "Check a domain: MX records and mail provider, SPF/DMARC, whether " +
            "it is a disposable or free webmail domain, and risk signals.",
        docsUrl: "https://docs.veille.io",
        categories: ["company-enrichment"],
        notes: ["2 Veille credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/intelligence/domain" },
    input: { schema: { queryParams: zVeilleDomainQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
