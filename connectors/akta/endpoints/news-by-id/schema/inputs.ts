import { z } from "zod";

/** Akta /v1/news/by-id query params (agent-docs OpenAPI, 2026-10-21). The
 *  vendor takes one comma-separated string; the mirror keeps it an ARRAY,
 *  like the news list filters, and the provider toRequest joins it. */
export const zNewsByIdQueryParams = z.object({
    news_ids: z.array(z.string().min(1)).describe(
        "News article ids — the `id` values returned by the Akta News " +
            "endpoint. Comma-separated on the wire.",
    ),
}).strict();
