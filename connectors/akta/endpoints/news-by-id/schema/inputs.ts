import { z } from "zod";

/** Akta /v1/news/by-id query params (agent-docs OpenAPI, 2026-10-21). The
 *  vendor takes one comma-separated string; the mirror keeps it an ARRAY,
 *  like the news list filters, and the provider toRequest joins it. */
export const zNewsByIdQueryParams = z.object({
    news_ids: z.array(z.number().int().positive()).min(1).describe(
        "News article ids — the integer `id` values returned by the Akta " +
            "News endpoint, at least one. Comma-separated on the wire.",
    ),
}).strict();
