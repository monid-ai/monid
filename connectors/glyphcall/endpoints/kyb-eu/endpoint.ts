import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKybEuQueryParams } from "./schema/inputs.ts";

/** GET /pack/kyb-eu - $0.02 per successful call; errors are free. */
export default defineEndpoint({
    meta: {
        displayName: "Glyphcall EU KYB Check",
        summary:
            "Verify a European company by name, VAT number or LEI: registers, VIES, GLEIF and sanctions in one call.",
        description:
            "Know-your-business check for a European company: finds it by name, " +
            "EU VAT number or LEI in the Swedish, Norwegian, Finnish and French " +
            "company registers, validates the VAT number in VIES, reads its LEI " +
            "record from GLEIF and screens the name against sanctions lists, " +
            "then returns one verdict with the facts behind it. A section that " +
            "fails is listed in failed and the rest still answer. Will not: " +
            "give a credit score or beneficial owners.",
        docsUrl: "https://glyphcall.com/tools/pack-kyb-eu",
        categories: ["compliance", "company-enrichment", "government-data"],
        notes: [
            "$0.02 per successful call. Refused inputs and unanswered sources are free.",
            "Give q, vat or lei.",
        ],
    },
    request: { method: "GET", path: "/pack/kyb-eu" },
    input: { schema: { queryParams: zKybEuQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "check",
            consumes: { credit: "default", amount: 0.02 },
        },
    },
});
