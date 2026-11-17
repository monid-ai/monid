import { z } from "zod";
import { zAmazonUrl, zAsin } from "../../../schema/common.ts";

export const zBody = z.strictObject({
    parserName: z.literal("amazonAlexa").optional(),
    param: z.array(z.string().min(1)).min(1).max(5).describe(
        "Shopping questions, answered sequentially within this call.",
    ),
    site: z.enum(["us", "jp"]).optional(),
    screenshot: z.boolean().optional(),
    asin: zAsin.optional(),
    url: zAmazonUrl.optional(),
    timeout: z.number().int().min(30000).max(240000).optional(),
});
