import { z } from "zod";
import { zEmail } from "../../../schema/common.ts";

/** GET /email-sources query — the vendor mirror (docs.tomba.io
 *  api/email#email-sources, 2026-11-11). */
export const zEmailSourcesQueryParams = z.object({
    email: zEmail.describe("The email address to look up.").optional(),
}).strict();
