import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFilingsQueryParams } from "./schema/inputs.ts";

/** GET /filings — a company's filings, newest first. */
export default defineEndpoint({
    meta: {
        displayName: "List Company Filings",
        summary: "List a company's filings with form type, date and a " +
            "link to the official document.",
        description: "List the filings of up to 10 companies, newest " +
            "first, one row per filing: ticker, market, form_type in the " +
            "market's native encoding (US SEC form names such as 10-K / " +
            "8-K; Japan EDINET numeric codes and TDnet labels; China " +
            "`annual_report`, `q1_report` and the like), title, " +
            "filing_date, period_of_report, accession_number and " +
            "filing_url to the official source. US covers every form type " +
            "for the last 5 years; China and Japan cover financial " +
            "reports for the last 3 years. Use it to find which documents " +
            "exist and to get their official links; to search inside the " +
            "text of filings, use `/filing-search`.",
        docsUrl: "https://drillr.ai/docs/api/filings",
        categories: ["equities", "government-data"],
        notes: [
            "There is no date or form-type filter: every filing in the " +
            "coverage window comes back, so select annual or quarterly " +
            "reports on the `form_type` of the returned rows and page " +
            "with `limit` / `page`.",
            "`title` is always null for US filings; identify them by " +
            "`form_type` and `filing_date`.",
            "An amendment is marked only by the `/A`, `訂正` or `更正` " +
            "suffix on `form_type`.",
            "A filing involving several companies (SC 13D / 13G) appears " +
            "once under each related ticker; a row is identified by " +
            "`ticker` plus `accession_number`.",
        ],
    },
    request: { method: "GET", path: "/filings" },
    input: { schema: { queryParams: zFilingsQueryParams } },
    usage: {
        /** 0.02 credits per call — the endpoint's page states "20 cr /
         *  thousand calls"; a multi-ticker request is still one call.
         *  (The MCP twin `filing_list` is 0.1; REST is pinned.) */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "data call",
            consumes: { credit: "default", amount: 0.02 },
        },
    },
});
