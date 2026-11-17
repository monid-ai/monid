import { z } from "zod";
import { zHttpUrl } from "./common.ts";

/** Current Docs mirrors. Ambiguous optional fields remain documented in the handoff. */
export const commerceInputs = {
    "amazon-product": z.strictObject({
        type: z.literal("product"),
        url: zHttpUrl,
        zip_code: z.string().optional(),
    }),
    "amazon-seller": z.strictObject({
        type: z.literal("seller"),
        url: zHttpUrl,
        zip_code: z.string(),
    }),
    "amazon-keywords": z.strictObject({
        type: z.literal("keywords"),
        keywords: z.string().min(1),
        page: z.number().int().positive().optional(),
        domain: z.string().optional(),
        department: z.string().optional(),
        zip_code: z.string().optional(),
    }),
    "amazon-rufus": z.strictObject({
        type: z.literal("rufus"),
        keywords: z.string().min(1),
        domain: z.string().min(1),
        is_sse_data: z.boolean().optional().describe(
            "Include upstream event records in the returned JSON html field. Native true/false samples are recorded. This is buffered JSON, not a Monid SSE streaming transport toggle.",
        ),
        is_get_question: z.boolean().optional().describe(
            "Request per-product recommendation questions when products are returned, per the official changelog. Native true adds products[].related_questions in the recorded comparison; top-level result.related_questions occurs even when false. Passed unchanged, with no local filtering.",
        ),
        asin: z.string().optional().describe(
            "Amazon ASIN used as product context for this request; native with/without-ASIN comparison is recorded. Send it on each independent call: this connector does not expose a persistent Rufus conversation session.",
        ),
    }),
    "tiktok-user-detail": z.strictObject({ unique_id: z.string().min(1) }),
    "tiktok-user-work": z.strictObject({
        sec_uid: z.string().min(1),
        cursor: z.string().optional().describe(
            "Opaque supplier cursor; initial value is string 0. Passed unchanged. Use supplier-provided continuation values for subsequent requests.",
        ),
        count: z.number().int().positive().optional().describe(
            "Requested post sample size; supplier documents default 35. Recorded counts 1 and 2 succeeded. Not a complete-history guarantee.",
        ),
    }),
    "tiktok-shop-page": z.strictObject({
        product_id: z.string().min(1),
        region: z.string().min(1),
    }),
};
export function commerceBody(name: keyof typeof commerceInputs) {
    const actors = {
        "amazon-product": "scraper.amazon",
        "amazon-seller": "scraper.amazon",
        "amazon-keywords": "scraper.amazon",
        "amazon-rufus": "scraper.amazon",
        "tiktok-user-detail": "scraper.tiktok.user.detail",
        "tiktok-user-work": "scraper.tiktok.user.work",
        "tiktok-shop-page": "scraper.tiktok.shop.page",
    };
    return z.strictObject({
        actor: z.literal(actors[name]).default(actors[name]),
        input: commerceInputs[name],
    });
}
