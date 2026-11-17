import { z } from "zod";
import { zEmail } from "../../../schema/common.ts";

/** GET /people/find query — the vendor mirror (docs.tomba.io
 *  api/enrichment#person-api, 2026-11-11). `webhook_url` is left out
 *  (design D5). */
export const zPeopleFindQueryParams = z.object({
    email: zEmail.describe("The email address to look up.").optional(),
}).strict();
