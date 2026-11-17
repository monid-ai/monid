import { z } from "zod";
import { zEnrichMobile, zLinkedinUrl } from "../../../schema/common.ts";

/** GET /linkedin query — the vendor mirror (docs.tomba.io
 *  api/finder#linkedin-finder, 2026-11-11). `webhook_url` is left out
 *  (design D5). */
export const zLinkedinQueryParams = z.object({
    url: zLinkedinUrl.optional(),
    enrich_mobile: zEnrichMobile.optional(),
    full: z.boolean().describe(
        "Set to true to get an array of the addresses Tomba has stored for " +
            "the profile (up to two) instead of the single most likely " +
            "one. phone_data isn't included in this mode.",
    ).optional(),
}).strict();
