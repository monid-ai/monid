import { z } from "zod";

/**
 * /v1/google/search query params — mirrors the vendor OpenAPI
 * (https://docs.autom.dev). Optionality only; strict, so an unknown key is rejected.
 */
export const zAutomGoogleSearchQueryParams = z.strictObject({
    query: z.string().min(1).describe(
        "The search query. Google operators such as `site:` are " +
            "supported.",
    ),
    gl: z.string().regex(/^[a-zA-Z]{2}$/).describe(
        "Two-letter country code the results come from, for example `us` " +
            "or `de`.",
    ).optional(),
    hl: z.string().regex(/^[a-zA-Z]{2,3}$/).describe(
        "Language code of the results, for example `en` or `fr`.",
    ).optional(),
    page: z.number().int().min(1).describe(
        "Results page, 1 for the first. Each page is one request and one " +
            "credit.",
    ).optional(),
});
