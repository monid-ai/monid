import { z } from "zod";

/** `GET /pack/kyb-eu` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Optionality mirrors the vendor (D25); vendor-stated
 *  bounds stay here. "At least one of" is a union of
 *  .required arms: Give q, vat or lei. */
const base = z.object({
    q: z.string().describe(
        "Company name.",
    ).optional(),
    vat: z.string().describe(
        "EU VAT number with its country prefix.",
    ).optional(),
    lei: z.string().describe(
        "LEI (20 characters) instead of a name.",
    ).optional(),
    country: z.string().describe(
        "Only these countries for the register search: ISO codes or names, comma-separated.",
    ).optional(),
});

export const zKybEuQueryParams = z.union([
    base.required({ q: true }),
    base.required({ vat: true }),
    base.required({ lei: true }),
]);
