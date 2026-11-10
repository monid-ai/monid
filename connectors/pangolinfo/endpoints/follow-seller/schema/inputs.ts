import { z } from "zod";
import { zAsin, zSite, zZipContext } from "../../../schema/common.ts";

export const zBody = z.strictObject({
    site: zSite,
    content: zAsin.describe(
        "ASIN whose competing seller offers should be retrieved.",
    ),
    timeout: z.number().int().min(30000).max(240000).optional(),
    bizContext: zZipContext.optional(),
});
