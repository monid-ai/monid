import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFilingSearchQueryParams } from "./schema/inputs.ts";

/** GET /filing-search — search inside one company's filings. */
export default defineEndpoint({
    meta: {
        displayName: "Search Inside Company Filings",
        summary: "Search the text of one company's filings and get the " +
            "matching passages, optionally with as-reported facts.",
        description: "Semantic and keyword search inside ONE company's " +
            "SEC filings or Chinese / Japanese financial reports, for " +
            "facts that standard statement fields do not carry: segment " +
            "data, contractual commitments, footnotes, risk language. " +
            "Returns `data.passages`, ordered by score: ticker, market, " +
            "form_type, filing_date, language, section heading, and a " +
            "snippet of up to 4000 characters with tables converted to " +
            "markdown. With `include_facts=true` it also returns " +
            "`data.facts`: as-reported numbers with metric name, value, " +
            "printed_value, unit, currency, fiscal_year, fiscal_period, " +
            "period_start, period_end, xbrl_concept, form_type and " +
            "accession. It does not return whole documents and does not " +
            "search across companies — call it once per ticker, and use " +
            "`/filings` for the link to the full document.",
        docsUrl: "https://drillr.ai/docs/api/filing-search",
        categories: ["equities", "government-data"],
        notes: [
            "`from` / `to` filter the reporting period a passage belongs " +
            "to, not the filing date; there is no filing-date parameter.",
            "An empty `facts` array is normal even with " +
            "`include_facts=true`: only companies in the fact index have " +
            "facts, and the answer is usually in `passages`.",
            "The Japanese corpus effectively starts at 2024-01 and the " +
            "Chinese corpus concentrates on recent reporting seasons, so " +
            "an empty result for an older period is a corpus boundary, " +
            "not evidence that nothing was disclosed.",
            "Passages carry no stable id. `ticker` + `form_type` + " +
            "`filing_date` locate the filing in `/filings` but are not " +
            "unique.",
            "Results can include passages filed under the same company's " +
            "other tickers (share classes, historical codes), each with " +
            "its own `ticker`.",
        ],
    },
    request: { method: "GET", path: "/filing-search" },
    input: { schema: { queryParams: zFilingSearchQueryParams } },
    usage: {
        /** 0.1 credits per call — REST card "/filing-search 100 cr /
         *  thousand calls", regardless of hit count. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "search",
            consumes: { credit: "default", amount: 0.1 },
        },
    },
});
