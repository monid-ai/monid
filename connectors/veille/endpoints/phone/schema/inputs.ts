import { z } from "zod";

/**
 * /v1/intelligence/phone query params — mirrors the vendor OpenAPI
 * (https://docs.veille.io). Optionality only; strict, so an unknown key is rejected.
 */
export const zVeillePhoneQueryParams = z.strictObject({
    query: z.string().min(3).describe(
        "Phone number in international format, for example " +
            "`+33612345678`.",
    ),
});
