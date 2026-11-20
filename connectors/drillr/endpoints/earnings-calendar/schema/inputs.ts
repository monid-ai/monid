import { z } from "zod";
import { zDate, zPage, zRowLimit } from "../../../schema/common.ts";

/** GET /earnings-calendar query params
 *  (drillr.ai/docs/api/earnings-calendar). There is no ticker parameter
 *  upstream. */
export const zEarningsCalendarQueryParams = z.object({
    from: zDate.describe(
        "First announcement date, `YYYY-MM-DD`, inclusive.",
    ),
    to: zDate.describe(
        "Last announcement date, `YYYY-MM-DD`, inclusive; at most 90 " +
            "days after `from`.",
    ),
    limit: zRowLimit.optional(),
    page: zPage.optional(),
}).strict();
