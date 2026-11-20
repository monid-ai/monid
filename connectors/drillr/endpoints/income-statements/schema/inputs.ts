import { z } from "zod";
import { statementQueryFields } from "../../../schema/common.ts";

/** GET /income-statements query params (drillr.ai/docs/api/income-statements). */
export const zIncomeStatementsQueryParams = z.object(statementQueryFields)
    .strict();
