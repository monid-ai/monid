import { z } from "zod";

/** `GET /vat/validate` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Optionality mirrors the vendor (D25); vendor-stated
 *  bounds stay here. Selectors reject the empty string. "At least one
 *  of" is a union of .required arms: Give vat or name (or both). */
const base = z.object({
    vat: z.string().min(1).describe(
        "VAT number with its 2-letter EU country prefix, e.g. SE556703748501.",
    ).optional(),
    name: z.string().min(1).describe(
        "Company name to look up instead of a VAT number: found or not in the FR, SE, NO and FI registers.",
    ).optional(),
    country: z.string().min(1).describe(
        "With name: search only this register (FR, SE, NO or FI, or the country's name).",
    ).optional(),
});

export const zVatValidateQueryParams = z.union([
    base.required({ vat: true }),
    base.required({ name: true }),
]);
