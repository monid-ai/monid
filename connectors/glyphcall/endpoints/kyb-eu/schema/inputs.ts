import { z } from "zod";

/** `GET /pack/kyb-eu` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Optionality mirrors the vendor (D25); vendor-stated
 *  bounds stay here. Selectors reject the empty string: "" is not a
 *  company name, VAT number or LEI. "At least one of" is a union of
 *  .required arms: Give q, vat or lei. */
const base = z.object({
    q: z.string().min(1).describe(
        "Company name.",
    ).optional(),
    vat: z.string().min(1).describe(
        "EU VAT number with its country prefix.",
    ).optional(),
    lei: z.string().min(1).describe(
        "LEI (20 characters) instead of a name.",
    ).optional(),
    country: z.string().min(1).describe(
        "Only these countries for the register search: ISO codes or names, comma-separated.",
    ).optional(),
});

export const zKybEuQueryParams = z.union([
    base.required({ q: true }),
    base.required({ vat: true }),
    base.required({ lei: true }),
]);
