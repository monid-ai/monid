import { z } from "zod";
import { zCompany } from "../../../schema/common.ts";

/** Akta /v1/company/posts query params (agent-docs OpenAPI, 2026-10-21). */
export const zPostsQueryParams = z.object({
    company: zCompany,
    limit: z.number().int().min(1).optional().describe(
        "Maximum number of posts to return. Default 10.",
    ),
    offset: z.number().int().min(0).optional().describe(
        "Number of posts to skip before returning records. Default 0.",
    ),
}).strict();
