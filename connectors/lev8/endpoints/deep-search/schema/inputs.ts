import { z } from "zod";

/**
 * `POST /v1/deep-search` body — OpenAPI `DeepSearchRequest`
 * (docs.lev8.com/openapi.yaml, 2026-10-16). STRICT, because Lev8's is
 * (`additionalProperties: false`; unknown fields answer 422).
 */
export const zLev8DeepSearchBody = z.strictObject({
    query: z.string().min(1).max(4000).describe(
        "Natural-language research question, 1 to 4,000 characters " +
            "after trimming.",
    ),
});
