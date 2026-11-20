import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zInsiderTradesQueryParams } from "./schema/inputs.ts";

/** GET /insider-trades — SEC Forms 3, 4 and 5 for one US company. */
export default defineEndpoint({
    meta: {
        displayName: "Get Insider Holdings and Transactions",
        summary: "Insider holdings and transactions for one US company " +
            "from SEC Forms 3, 4 and 5.",
        description: "List what a US company's officers, directors and " +
            "other reporting persons disclosed on SEC Forms 3, 4 and 5, " +
            "newest filing first. Each row is one Form 3 initial holding " +
            "or one Form 4 / 5 transaction: insider_name, insider_title, " +
            "is_director, is_officer, record_type, transaction_type " +
            "(buy, sell, award, exercise, tax_withholding, other), the " +
            "original SEC transaction_code, transaction_date, " +
            "security_title, ownership_type (direct / indirect), shares, " +
            "price_per_share, total_value, shares_owned_after, " +
            "form_type, is_amendment, original_filing_date, " +
            "accession_number, filing_url and filing_date. Covers " +
            "filings from the last 5 years. Filter by filing-date range, " +
            "record type, form, transaction type and amendment status. " +
            "For institutional (13F) holders this is the wrong endpoint.",
        docsUrl: "https://drillr.ai/docs/api/insider-trades",
        categories: ["equities", "government-data"],
        notes: [
            "US only, and one ticker per call.",
            "`from` / `to` filter the filing date, not the transaction " +
            "date; the two can differ.",
            "`shares` is never negative, sales included. Read " +
            "`transaction_type` and `transaction_code` for direction; " +
            "summing `shares` does not give net purchases.",
            "Amended filings are separate rows and do not replace the " +
            "original. Do not add an original and its amendment " +
            "together; `is_amendment=false` drops amendments but does " +
            "not yield a corrected list.",
            "On an initial-holding row, transaction_type, " +
            "transaction_code, transaction_date, price_per_share and " +
            "total_value are null and `shares` is the holding.",
            "One filing can produce several rows, so `accession_number` " +
            "identifies a filing, not a row.",
        ],
    },
    request: { method: "GET", path: "/insider-trades" },
    input: { schema: { queryParams: zInsiderTradesQueryParams } },
    usage: {
        /** 0.02 credits per call — the endpoint's page states "20 cr /
         *  thousand calls". */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "data call",
            consumes: { credit: "default", amount: 0.02 },
        },
    },
});
