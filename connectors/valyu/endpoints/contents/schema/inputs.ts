import { z } from "zod";
import { zHttpUrl, zResponseLength } from "../../../schema/common.ts";

// Vendor mirror includes the asynchronous surface. The endpoint binding
// narrows it to synchronous retrieval without changing the vendor schema.
export const zValyuContentsBody = z.looseObject({
    urls: z.array(zHttpUrl).min(1).max(50)
        .describe("HTTP/HTTPS URLs; Valyu silently removes duplicates."),
    response_length: zResponseLength.optional(),
    max_price_dollars: z.number().positive().optional()
        .describe("Total extraction budget in US dollars."),
    summary: z.union([
        z.boolean(),
        z.string().max(500),
        z.record(z.string(), z.json()),
    ]).optional(),
    extract_effort: z.enum(["auto", "normal", "high"]).optional(),
    screenshot: z.boolean().optional(),
    async: z.boolean().optional(),
    webhook_url: z.url().optional(),
});
