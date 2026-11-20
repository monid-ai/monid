import { z } from "zod";
import { statementQueryFields } from "../../../schema/common.ts";

/** GET /balance-sheets query params (drillr.ai/docs/api/balance-sheets). */
export const zBalanceSheetsQueryParams = z.object(statementQueryFields)
    .strict();
