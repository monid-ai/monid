import { z } from "zod";

/**
 * Shared fragments for the drillr endpoint schemas. Faithful vendor
 * mirror of the parameter tables on drillr.ai/docs/api/<endpoint> (spec
 * r116, read 2026-11-20): optionality only, no defaults — the documented
 * upstream default is stated in each describe.
 *
 * drillr spells every multi-value parameter as ONE comma-separated
 * string (`ticker=AAPL,MSFT`, `period=FY,Q4`), not as a repeated key, so
 * those parameters are strings here. Closed vocabularies keep their
 * validation through a pattern, which survives compilation.
 */

/** `YYYY-MM-DD`. z.iso.date() compiles to a calendar-aware pattern. */
export const zDate = z.iso.date();

/** A comma-separated list drawn from a closed vocabulary. */
export const zEnumList = (values: readonly string[]) =>
    z.string().regex(
        new RegExp(`^(${values.join("|")})(,(${values.join("|")}))*$`),
    );

const TICKER_FORM = "Canonical form only: US `AAPL` or `BRK-B`, China " +
    "`600519.SH` / `000001.SZ` / `920000.BJ`, Japan `7203.T`.";

/** One or more canonical tickers in one comma-separated string. */
export const zTickers = (max: number) =>
    z.string().min(1).describe(
        `Up to ${max} tickers, comma-separated. ${TICKER_FORM}`,
    );

/** Exactly one canonical ticker. */
export const zTicker = (lead: string) =>
    z.string().min(1).describe(`${lead} ${TICKER_FORM}`);

/** `page` on the endpoints that page (pages start at 1). */
export const zPage = z.number().int().min(1).describe(
    "Page number, starting at 1. Default: 1. A page shorter than `limit` " +
        "is the last one.",
);

/** `limit` on the row-listing endpoints (maximum 500, default 50). */
export const zRowLimit = z.number().int().min(1).max(500).describe(
    "Rows per page. Maximum 500. Default: 50.",
);

/** Query params shared by /income-statements, /balance-sheets and
 *  /cash-flow-statements — the three statements take the same three. */
export const statementQueryFields = {
    ticker: zTickers(10),
    period: zEnumList(["FY", "Q1", "Q2", "Q3", "Q4"]).describe(
        "Reporting periods to return: `FY` (full fiscal year; there is no " +
            "TTM) and `Q1`-`Q4` (quarters of the company's own fiscal " +
            "year). Several values comma-separated, e.g. `FY,Q4`. Only " +
            "periods with data come back. Default: FY.",
    ).optional(),
    limit: z.number().int().min(1).max(40).describe(
        "Number of periods per ticker, counting back from the most " +
            "recent. Maximum 40. Default: 4.",
    ).optional(),
};

/** The provenance block every statement row carries, for descriptions. */
export const STATEMENT_ROW_META =
    "Each row also carries ticker, market, fiscal_year, period, " +
    "period_start, report_period, currency, accounting_standard, " +
    "accession_number, form_type, filing_url, filing_date, and " +
    "derived_fields with a derivation tree for every value drillr " +
    "calculated rather than read off the filing.";
