import { z } from "zod";

/** `GET /se/company` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Optionality mirrors the vendor (D25); vendor-stated
 *  bounds stay here. Selectors reject the empty string. "At least one
 *  of" is a union of .required arms: Give orgnr or name. */
const base = z.object({
    orgnr: z.string().min(1).describe(
        "Swedish organisationsnummer (10 digits, with or without the hyphen) or Swedish VAT number.",
    ).optional(),
    name: z.string().min(1).describe(
        "Company name to search for instead of orgnr.",
    ).optional(),
    checkVat: z.string().describe(
        "true to also check the VAT number live in VIES.",
    ).optional(),
    city: z.string().min(1).describe(
        "With name: only companies whose postal address is in this city.",
    ).optional(),
    limit: z.number().int().min(1).max(10).describe(
        "Matches for a name search, 1-10 (vendor default 5).",
    ).optional(),
});

export const zSeCompanyQueryParams = z.union([
    base.required({ orgnr: true }),
    base.required({ name: true }),
]);
