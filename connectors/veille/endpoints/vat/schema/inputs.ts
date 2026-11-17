import { z } from "zod";

/**
 * /v1/vat query params — mirrors the vendor OpenAPI
 * (https://docs.veille.io). Optionality only; strict, so an unknown key is rejected.
 */
export const zVeilleVatQueryParams = z.strictObject({
    query: z.string().min(4).describe(
        "VAT number with its country prefix, for example `FR40303265045`.",
    ),
});
