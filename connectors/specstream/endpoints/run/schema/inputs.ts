import { z } from "zod";

/**
 * `POST /v1/capacity/executions` request body: approve one signed quote and
 * start its find. Every field comes from the quote the caller was shown.
 */
export const zRunBody = z.object({
    quote_id: z.string().describe(
        "The `quote_id` of the quote to approve, from specstream#v1/capacity/quotes.",
    ),
    quote_hash: z.string().regex(/^[0-9a-f]{64}$/).describe(
        "The `quote_hash` of that quote.",
    ),
    idempotency_key: z.string().min(8).max(128).describe(
        "A stable key for this run. Retrying with the same key never buys " +
            "twice, and it is the handle that reads the run back.",
    ),
    confirm_max_cents: z.number().int().min(0).describe(
        "The approved maximum in cents, equal to the quote's `maximum_cents`. " +
            "SpecStream reserves it and charges only for the matching results " +
            "found; the rest is never charged.",
    ),
    authority_id: z.string().describe(
        "A delegated spending limit to run under, when the key acts for a " +
            "member or agent with its own limit.",
    ).optional(),
});
