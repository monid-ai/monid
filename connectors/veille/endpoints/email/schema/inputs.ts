import { z } from "zod";

/**
 * /v1/intelligence/email query params — mirrors the vendor OpenAPI
 * (https://docs.veille.io). Optionality only; strict, so an unknown key is rejected.
 */
export const zVeilleEmailQueryParams = z.strictObject({
    query: z.email().describe(
        "The email address to check.",
    ),
});
