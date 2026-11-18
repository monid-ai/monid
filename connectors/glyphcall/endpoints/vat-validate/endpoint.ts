import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zVatValidateQueryParams } from "./schema/inputs.ts";

/** GET /vat/validate - $0.01 per successful call; errors are free. */
export default defineEndpoint({
    meta: {
        displayName: "Glyphcall EU VAT Validation",
        summary:
            "Validate an EU VAT number live against the European Commission's VIES, with the registered name.",
        description: "Validates an EU VAT number live against VIES (European " +
            "Commission): valid or not, the country, and the registered name " +
            "and address where the member state shares them. Or give a company " +
            "name with country FR, SE, NO or FI to find it in that national " +
            "company register instead. Busy member-state services are asked " +
            "again a few times before the call fails, and a failed call is " +
            "free. Will not: validate non-EU tax numbers (except the Nordic " +
            "registers by name) or give credit data.",
        docsUrl: "https://glyphcall.com/tools/vat-validate",
        categories: ["compliance", "company-enrichment"],
        notes: [
            "$0.01 per successful call. Refused inputs and unanswered sources are free.",
            "Give vat or name (or both).",
        ],
    },
    request: { method: "GET", path: "/vat/validate" },
    input: { schema: { queryParams: zVatValidateQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "check",
            consumes: { credit: "default", amount: 0.01 },
        },
    },
});
