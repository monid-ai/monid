import { z } from "zod";
import { zLimit } from "../../../schema/common.ts";

/** GET /rising-companies query params — faithful mirror of the
 *  published OpenAPI (2026-10-12). */
export const zRisingCompaniesQueryParams = z.object({
    limit: zLimit.optional(),
}).strict();
