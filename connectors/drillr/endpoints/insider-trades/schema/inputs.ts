import { z } from "zod";
import { zDate, zEnumList, zPage, zRowLimit } from "../../../schema/common.ts";

/** GET /insider-trades query params
 *  (drillr.ai/docs/api/insider-trades). */
export const zInsiderTradesQueryParams = z.object({
    ticker: z.string().min(1).describe(
        "A single US ticker in canonical form (`AAPL`, `BRK-B`); no " +
            "comma-separated list.",
    ),
    from: zDate.describe(
        "First FILING date (`filing_date`), `YYYY-MM-DD`, inclusive — " +
            "not the transaction date. For a single day set `from` " +
            "equal to `to`.",
    ).optional(),
    to: zDate.describe(
        "Last filing date, `YYYY-MM-DD`, inclusive.",
    ).optional(),
    record_type: zEnumList(["initial_holding", "transaction"]).describe(
        "`initial_holding` (Form 3) and / or `transaction` (Form 4 or " +
            "5), comma-separated. Default: both.",
    ).optional(),
    form_type: zEnumList(["3", "3/A", "4", "4/A", "5", "5/A"]).describe(
        "SEC forms to keep, comma-separated: `3`, `3/A`, `4`, `4/A`, " +
            "`5`, `5/A`. Default: all.",
    ).optional(),
    transaction_type: zEnumList([
        "buy",
        "sell",
        "award",
        "exercise",
        "tax_withholding",
        "other",
    ]).describe(
        "Normalized transaction types to keep, comma-separated: `buy`, " +
            "`sell`, `award`, `exercise`, `tax_withholding`, `other`. " +
            "Default: all.",
    ).optional(),
    is_amendment: z.boolean().describe(
        "`true` returns amended filings only, `false` original filings " +
            "only. Omit for both.",
    ).optional(),
    limit: zRowLimit.optional(),
    page: zPage.optional(),
}).strict();
