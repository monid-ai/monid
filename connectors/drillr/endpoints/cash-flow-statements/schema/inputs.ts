import { z } from "zod";
import { statementQueryFields } from "../../../schema/common.ts";

/** GET /cash-flow-statements query params (drillr.ai/docs/api/cash-flow-statements). */
export const zCashFlowStatementsQueryParams = z.object(statementQueryFields)
    .strict();
