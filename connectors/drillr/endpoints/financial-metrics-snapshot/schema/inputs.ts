import { z } from "zod";
import { zTickers } from "../../../schema/common.ts";

/** GET /financial-metrics-snapshot query params
 *  (drillr.ai/docs/api/financial-metrics-snapshot). */
export const zFinancialMetricsSnapshotQueryParams = z.object({
    ticker: zTickers(50),
}).strict();
