import { z } from "zod";
import { zEnumList, zPage } from "../../../schema/common.ts";

/** GET /tickers query params (drillr.ai/docs/api/tickers). `limit` has
 *  two documented ceilings — 50 with `query`, 500 without; the mirror
 *  carries the wider one and the describe states both. */
export const zTickersQueryParams = z.object({
    query: z.string().min(1).describe(
        "Company name, ticker, ISIN, CIK or CUSIP. Exact match, " +
            "case-insensitive; no prefix or substring matching. A ticker " +
            "must already be in canonical form with its market suffix " +
            "(`7203.T`, not `7203`). Omit to list every trading common " +
            "stock instead.",
    ).optional(),
    market: zEnumList(["US", "CN", "JP"]).describe(
        "Restrict to markets: `US`, `CN`, `JP`, several comma-separated " +
            "(`US,JP`). Default: all three. Any other value returns 400.",
    ).optional(),
    limit: z.number().int().min(1).max(500).describe(
        "Maximum rows. With `query`: maximum 50, default 10. Without " +
            "`query`: maximum 500, default 500.",
    ).optional(),
    page: zPage.describe(
        "Page number for list mode (no `query`), starting at 1. Default: " +
            "1. With `query` there is no paging: 1 is ignored and a " +
            "larger value returns 400.",
    ).optional(),
}).strict();
