import { z } from "zod";

/** `GET /sanctions/check` query params (api.glyphcall.com/openapi.json,
 *  2026-11-18). Mirror: optionality only (D25). */
export const zSanctionsCheckQueryParams = z.object({
    address: z.string().describe(
        "Crypto address to check against OFAC (give address, name or both).",
    ).optional(),
    name: z.string().describe(
        "Person or company name.",
    ).optional(),
    lists: z.string().describe(
        "Lists for a name: all (vendor default), or any of ofac, eu, un, uk, comma-separated.",
    ).optional(),
});
