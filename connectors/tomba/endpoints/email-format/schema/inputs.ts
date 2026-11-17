import { z } from "zod";
import { zDomain } from "../../../schema/common.ts";

/** GET /email-format query — the vendor mirror (docs.tomba.io
 *  api/finder#email-format, 2026-11-11). */
export const zEmailFormatQueryParams = z.object({
    domain: zDomain.optional(),
}).strict();
