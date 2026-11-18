import { z } from "zod";

/** `GET /vat/validate` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Mirror: optionality only (D25). */
export const zVatValidateQueryParams = z.object({
    vat: z.string().describe(
        "VAT number with its 2-letter EU country prefix, e.g. SE556703748501 (give vat or name).",
    ).optional(),
    name: z.string().describe(
        "Company name to look up instead of a VAT number: found or not in the FR, SE, NO and FI registers.",
    ).optional(),
    country: z.string().describe(
        "With name: search only this register (FR, SE, NO or FI, or the country's name).",
    ).optional(),
});
