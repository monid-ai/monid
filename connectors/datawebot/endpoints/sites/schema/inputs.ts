import { z } from "zod";

/** `GET /v1/sites` query parameters. */
export const zDatawebotSitesQueryParams = z.strictObject({
    site: z.string().min(2).max(253).describe(
        "A shop domain (walmart.com) or a shop name (allbirds).",
    ),
    country: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "Two-letter country code. Resolves a shop name to its domain in " +
            "that market.",
    ).optional(),
});
