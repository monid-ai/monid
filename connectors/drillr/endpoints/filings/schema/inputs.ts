import { z } from "zod";
import { zPage, zRowLimit, zTickers } from "../../../schema/common.ts";

/** GET /filings query params (drillr.ai/docs/api/filings). There is no
 *  date or form-type parameter upstream. */
export const zFilingsQueryParams = z.object({
    ticker: zTickers(10),
    limit: zRowLimit.optional(),
    page: zPage.optional(),
}).strict();
