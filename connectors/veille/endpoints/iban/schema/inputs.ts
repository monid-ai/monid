import { z } from "zod";

/**
 * /v1/vat/iban query params — mirrors the vendor OpenAPI
 * (https://docs.veille.io). Optionality only; strict, so an unknown key is rejected.
 */
export const zVeilleIbanQueryParams = z.strictObject({
    query: z.string().min(15).describe(
        "The IBAN, with or without spaces.",
    ),
});
