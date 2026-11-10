import { defineEndpoint } from "@shared/core";
import { zVeilleIbanQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/vat/iban — Validate an IBAN and get its bank and BIC.
 *
 * Billing: 1 Veille credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Veille IBAN Check",
        summary: "Validate an IBAN and get its bank and BIC.",
        description:
            "Validate an IBAN and get its country, bank name, BIC and whether " +
            "it is in the SEPA zone.",
        docsUrl: "https://docs.veille.io",
        categories: ["company-enrichment"],
        notes: ["1 Veille credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/vat/iban" },
    input: { schema: { queryParams: zVeilleIbanQueryParams } },
});
