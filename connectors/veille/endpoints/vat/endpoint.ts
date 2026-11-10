import { defineEndpoint } from "@shared/core";
import { zVeilleVatQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/vat — Validate an EU VAT number and get the registered company.
 *
 * Billing: 1 Veille credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Veille VAT Check",
        summary: "Validate an EU VAT number and get the registered company.",
        description:
            "Validate an EU VAT number against the official registry and get " +
            "the registered company name and address when the registry " +
            "discloses them.",
        docsUrl: "https://docs.veille.io",
        categories: ["company-enrichment"],
        notes: ["1 Veille credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/vat" },
    input: { schema: { queryParams: zVeilleVatQueryParams } },
});
