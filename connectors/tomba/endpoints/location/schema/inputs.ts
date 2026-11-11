import { z } from "zod";
import { zDomain } from "../../../schema/common.ts";

/** GET /location query — the vendor mirror (docs.tomba.io
 *  api/finder#location, 2026-11-11). */
export const zLocationQueryParams = z.object({
    domain: zDomain.optional(),
}).strict();
