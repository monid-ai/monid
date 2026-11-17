import { z } from "zod";

/** GET /author-finder query — the vendor mirror (docs.tomba.io
 *  api/finder#author-finder, 2026-11-11). `webhook_url` is left out
 *  (design D5). */
export const zAuthorFinderQueryParams = z.object({
    url: z.string().min(1).describe(
        "URL of the article or blog post, such as " +
            "'https://stripe.com/blog/online-payments-guide'. The scheme is " +
            "optional.",
    ).optional(),
}).strict();
