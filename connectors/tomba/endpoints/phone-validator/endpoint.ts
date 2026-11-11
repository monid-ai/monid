import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPhoneValidatorQueryParams } from "./schema/inputs.ts";

/** GET /phone-validator — is a phone number valid, and what is it? */
export default defineEndpoint({
    meta: {
        displayName: "Validate Phone Number",
        summary:
            "Check whether a phone number is valid and get its formats, line type, carrier, and region.",
        description: "Validate one phone number against its country's " +
            "numbering plan. Returns its validity, local / international / " +
            "E.164 / RFC 3966 formats, country code, line type (mobile, " +
            "fixed line, VoIP, …), carrier, region, and time zones. A " +
            "number that isn't valid returns 200 with an empty data array. " +
            "Suited for cleaning phone fields and routing calls or SMS.",
        docsUrl: "https://docs.tomba.io/api/phone#phone-validator",
        categories: ["people-enrichment"],
        notes: [
            "Every successful response costs 1 search credit, including " +
            "one with no data.",
            "A number whose country can't be determined fails with 422 — " +
            "send it in international format or add country_code.",
        ],
    },
    request: { method: "GET", path: "/phone-validator" },
    input: {
        schema: {
            queryParams: zPhoneValidatorQueryParams.required({ phone: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "phone validations",
            consumes: { credit: "search", amount: 1 },
        },
    },
});
