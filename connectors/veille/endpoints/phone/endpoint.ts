import { defineEndpoint } from "@shared/core";
import { zVeillePhoneQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/intelligence/phone — Check a phone number: validity, line type and carrier.
 *
 * Billing: 1 Veille credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Veille Phone Check",
        summary: "Check a phone number: validity, line type and carrier.",
        description:
            "Check a phone number in international format: whether it is " +
            "valid, its country, line type (mobile, landline, VoIP), carrier " +
            "and a risk score.",
        docsUrl: "https://docs.veille.io",
        categories: ["people-enrichment"],
        notes: ["1 Veille credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/intelligence/phone" },
    input: { schema: { queryParams: zVeillePhoneQueryParams } },
});
