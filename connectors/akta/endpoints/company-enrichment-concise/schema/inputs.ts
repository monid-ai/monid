import { z } from "zod";
import { zCompany } from "../../../schema/common.ts";

/** Akta /v1/company/enrichment/concise query params (agent-docs OpenAPI,
 *  2026-10-21). No `sections` — every call returns all sections, condensed. */
export const zConciseQueryParams = z.object({
    company: zCompany,
}).strict();
