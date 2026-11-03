import { z } from "zod";

/**
 * `POST /v1/capacity/quotes` request body, for a new find. The continuation
 * operations (`extend`, `add_facts`, `refresh`) need a parent find and are not
 * mirrored: this connector prices new work.
 */
export const zQuoteBody = z.object({
    ast_hash: z.string().regex(/^[0-9a-f]{64}$/).describe(
        "The `ast_hash` returned by specstream#v1/parse for the reading to price.",
    ),
    requested_units: z.number().int().min(1).max(10000).describe(
        "How many results to price and, once approved, to find.",
    ).optional(),
    minimum_units: z.number().int().min(1).max(10000).describe(
        "The fewest results still worth delivering. It cannot exceed " +
            "`requested_units`.",
    ).optional(),
});
