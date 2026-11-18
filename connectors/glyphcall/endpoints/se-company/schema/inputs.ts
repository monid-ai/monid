import { z } from "zod";

/** `GET /se/company` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Mirror: optionality only (D25). */
export const zSeCompanyQueryParams = z.object({
    orgnr: z.string().describe(
        "Swedish organisationsnummer (10 digits, with or without the hyphen) or Swedish VAT number (give orgnr or name).",
    ).optional(),
    name: z.string().describe(
        "Company name to search for instead of orgnr.",
    ).optional(),
    checkVat: z.string().describe(
        "true to also check the VAT number live in VIES.",
    ).optional(),
    city: z.string().describe(
        "With name: only companies whose postal address is in this city.",
    ).optional(),
    limit: z.number().int().describe(
        "Matches for a name search (1-10, vendor default 5).",
    ).optional(),
});
