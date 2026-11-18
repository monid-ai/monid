import { z } from "zod";

/** `GET /sanctions/check` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Optionality mirrors the vendor (D25); vendor-stated
 *  bounds stay here. Selectors reject the empty string. "At least one
 *  of" is a union of .required arms: Give address, name or both. */
const base = z.object({
    address: z.string().min(1).describe(
        "Crypto address to check against OFAC.",
    ).optional(),
    name: z.string().min(1).describe(
        "Person or company name.",
    ).optional(),
    lists: z.string().min(1).describe(
        "Lists for a name: all (vendor default), or any of ofac, eu, un, uk, comma-separated.",
    ).optional(),
});

export const zSanctionsCheckQueryParams = z.union([
    base.required({ address: true }),
    base.required({ name: true }),
]);
