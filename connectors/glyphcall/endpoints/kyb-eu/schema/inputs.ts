import { z } from "zod";

/** `GET /pack/kyb-eu` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Mirror: optionality only (D25). */
export const zKybEuQueryParams = z.object({
    q: z.string().describe(
        "Company name (give q, vat or lei).",
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
