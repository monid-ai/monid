import { z } from "zod";
import { zDomain } from "../../../schema/common.ts";

/** GET /technology query — the vendor mirror (docs.tomba.io
 *  api/domain#technology, 2026-11-11). */
export const zTechnologyQueryParams = z.object({
    domain: zDomain.optional(),
}).strict();
