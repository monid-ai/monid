import { z } from "zod";
import { zCompany } from "../../../schema/common.ts";

/** Akta /v1/company/headcount-trends query params (agent-docs OpenAPI,
 *  2026-10-21). */
export const zHeadcountTrendsQueryParams = z.object({
    company: zCompany,
}).strict();
