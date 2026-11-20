import { z } from "zod";
import { zTicker } from "../../../schema/common.ts";

const zYearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

/** GET /filing-search query params
 *  (drillr.ai/docs/api/filing-search). */
export const zFilingSearchQueryParams = z.object({
    query: z.string().min(1).describe(
        "Keywords or natural language, in English, Chinese or Japanese. " +
            "Filing text is indexed in the filing's own language (US " +
            "English, Japan Japanese, China Chinese), so query in that " +
            "language.",
    ),
    ticker: zTicker(
        "The single company to search; one ticker only, no " +
            "comma-separated list.",
    ),
    form_type: z.string().min(1).describe(
        "Filing types in the market's native encoding, several " +
            "comma-separated: US SEC form names (`10-K,10-Q`), Japan " +
            "EDINET numeric codes or TDnet labels, China `annual_report` " +
            "and the like. Default: all types.",
    ).optional(),
    from: zYearMonth.describe(
        "`YYYY-MM`. Start of the REPORTING-PERIOD range: a passage " +
            "matches when the period it reports on overlaps [from, to]. " +
            "This is not a filing-date filter.",
    ).optional(),
    to: zYearMonth.describe(
        "`YYYY-MM`. End of the reporting-period range.",
    ).optional(),
    limit: z.number().int().min(1).max(50).describe(
        "Maximum rows in EACH partition (`passages` and `facts` are " +
            "capped separately). Maximum 50. Default: 10.",
    ).optional(),
    include_facts: z.boolean().describe(
        "Also return the structured `facts` partition. Default: false " +
            "(passages only, `facts` an empty array).",
    ).optional(),
}).strict();
