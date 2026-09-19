import { z } from "zod";

export const zEnrichPathParams = z.object({
    profile_id: z.string().min(1).describe(
        "An Orbit profile id, an alias id, or a public slug.",
    ),
});

/**
 * `POST /v3/enrich/{profile_id}` body — the faithful mirror of the published
 * v3 `EnrichRequest` (design D25). `include_profile`'s vendor default (true)
 * is applied at the binding.
 */
export const zEnrichBody = z.object({
    request_id: z.string().min(1).optional().describe(
        "Your idempotency key. Keep it stable across retries of the same " +
            "operation.",
    ),
    operation: z.enum(["partial", "full", "regenerate"]).describe(
        "`partial` builds a useful profile, `full` builds the deepest " +
            "profile Orbit can, and `regenerate` rebuilds a fresh full " +
            "profile from current sources.",
    ),
    include_profile: z.boolean().optional().describe(
        "Embed the profile in the response once it is available.",
    ),
});
