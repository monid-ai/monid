import { z } from "zod";

/**
 * /v1/intelligence/domain query params — mirrors the vendor OpenAPI
 * (https://docs.veille.io). Optionality only; strict, so an unknown key is rejected.
 */
export const zVeilleDomainQueryParams = z.strictObject({
    query: z.string().min(1).describe(
        "The domain, for example `example.com`.",
    ),
});
