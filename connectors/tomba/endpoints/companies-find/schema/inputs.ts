import { z } from "zod";
import { zDomain } from "../../../schema/common.ts";

/** GET /companies/find query — the vendor mirror (docs.tomba.io
 *  api/enrichment#company-api, 2026-11-11). */
export const zCompaniesFindQueryParams = z.object({
    domain: zDomain.optional(),
}).strict();
