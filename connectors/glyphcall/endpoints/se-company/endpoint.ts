import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSeCompanyQueryParams } from "./schema/inputs.ts";

/** GET /se/company — $0.01 per successful call; errors are free. */
export default defineEndpoint({
    meta: {
        displayName: "Glyphcall Swedish Company Register",
        summary:
            "Look up a Swedish company in Bolagsverket by organisation number or name.",
        description:
            "Swedish company register (Bolagsverket) by organisationsnummer or " +
            "Swedish VAT number, or up to 10 companies by name (optionally in one " +
            "city): legal name, form, status including bankruptcy or liquidation, " +
            "registration date, SNI industry codes and postal address; " +
            "checkVat=true also validates the VAT number in VIES. Sole traders " +
            "(natural persons) are left out. Will not: give financial statements or " +
            "board members.",
        docsUrl: "https://glyphcall.com/tools/se-company",
        categories: ["company-enrichment", "government-data"],
        notes: [
            "$0.01 per successful call. Refused inputs and unanswered sources are free.",
        ],
    },
    request: { method: "GET", path: "/se/company" },
    input: { schema: { queryParams: zSeCompanyQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "check",
            consumes: { credit: "default", amount: 0.01 },
        },
    },
});
