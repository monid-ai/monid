import { z } from "zod";
import { zCompany } from "../../../schema/common.ts";

/** Akta /v1/company/jobs query params (agent-docs OpenAPI, 2026-10-21). */
export const zJobsQueryParams = z.object({
    company: zCompany,
    limit: z.number().int().min(1).optional().describe(
        "Maximum number of job listings to return. Default 10.",
    ),
    offset: z.number().int().min(0).optional().describe(
        "Number of listings to skip before returning records. Default 0.",
    ),
}).strict();
