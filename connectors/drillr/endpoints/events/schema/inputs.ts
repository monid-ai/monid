import { z } from "zod";
import {
    zDate,
    zEnumList,
    zPage,
    zRowLimit,
    zTickers,
} from "../../../schema/common.ts";

/** GET /events query params (drillr.ai/docs/api/events). */
export const zEventsQueryParams = z.object({
    ticker: zTickers(10).describe(
        "Up to 10 US tickers, comma-separated (`BA,GE`). Omit to scan " +
            "across all companies, together with `from` / `to`.",
    ).optional(),
    from: zDate.describe(
        "First event date (`event_date`), `YYYY-MM-DD`, inclusive. For a " +
            "single day set `from` equal to `to`.",
    ).optional(),
    to: zDate.describe(
        "Last event date, `YYYY-MM-DD`, inclusive.",
    ).optional(),
    event_class: zEnumList([
        "capital",
        "distribution",
        "share_structure",
        "transaction",
        "agreement",
        "governance",
        "ownership",
        "legal_regulatory",
    ]).describe(
        "Event classes to keep, several comma-separated: `capital` " +
            "(financings), `distribution` (dividends, buybacks), " +
            "`share_structure` (splits, class changes), `transaction` " +
            "(M&A, spin-offs, joint ventures), `agreement` (licenses, " +
            "supply, major contracts, settlements), `governance` " +
            "(executive, director and auditor changes), `ownership` " +
            "(13D/G stake changes), `legal_regulatory` (bankruptcy, " +
            "delisting). Default: all.",
    ).optional(),
    limit: zRowLimit.optional(),
    page: zPage.optional(),
}).strict();
