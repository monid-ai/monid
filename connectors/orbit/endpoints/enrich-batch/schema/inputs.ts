import { z } from "zod";

/**
 * `POST /v3/enrich` body — the faithful mirror of the published v3
 * `BatchEnrichRequest` (design D25). `include_profile`'s vendor default
 * (true) is applied at the binding.
 */
export const zBatchEnrichBody = z.object({
    request_id: z.string().min(1).optional().describe(
        "The parent idempotency key for the batch.",
    ),
    profile_ids: z.array(z.string().min(1)).min(1).max(20).describe(
        "1 to 20 Orbit profile ids or public slugs. Duplicates are " +
            "normalized before work starts.",
    ),
    operation: z.enum(["partial", "full", "regenerate"]).describe(
        "One operation, applied to every profile in the list.",
    ),
    include_profile: z.boolean().optional().describe(
        "Embed each child's profile once it is available.",
    ),
});
