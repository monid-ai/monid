import { z } from "zod";

/**
 * Ecommerce Leads `GET /api/stores/lookup` query params. The vendor
 * normalizes the value itself: it lowercases it and strips the scheme,
 * a leading `www.`, and any path, so `https://www.gymshark.com/pages/x`
 * resolves the same as `gymshark.com`.
 */
export const zLookupQueryParams = z.object({
    domain: z.string().min(1).max(253).describe(
        "The store domain. Example: gymshark.com. A full URL also works " +
            "(https://www.gymshark.com/collections/all); the scheme, " +
            "'www.', and path are stripped before matching.",
    ),
}).strict();
