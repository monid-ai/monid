import { z } from "zod";
import { zEmail, zEnrichMobile } from "../../../schema/common.ts";

/** GET /enrich query — the vendor mirror (docs.tomba.io
 *  api/finder#email-enrichment, 2026-11-11). `webhook_url` is left out
 *  (design D5). */
export const zEnrichQueryParams = z.object({
    email: zEmail.describe("The email address to enrich.").optional(),
    enrich_mobile: zEnrichMobile.optional(),
}).strict();
