import { z } from "zod";
import { zCompany } from "../../../schema/common.ts";

/** Akta /v1/company/website-traffic query params (agent-docs OpenAPI,
 *  2026-10-21). */
export const zWebsiteTrafficQueryParams = z.object({
    company: zCompany,
}).strict();
