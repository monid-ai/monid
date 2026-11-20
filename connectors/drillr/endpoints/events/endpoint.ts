import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEventsQueryParams } from "./schema/inputs.ts";

/** GET /events — the US company event timeline (8-K and 13D/G). */
export default defineEndpoint({
    meta: {
        displayName: "Get Company Event Timeline",
        summary: "US company events from SEC filings: financings, deals, " +
            "executive changes, dividends, buybacks and stake changes.",
        description: "List corporate events disclosed by US-listed " +
            "companies in SEC 8-K and Schedule 13D/G filings, newest " +
            "first: debt and equity issuances, dividends and buybacks, " +
            "splits, acquisitions, disposals, mergers and spin-offs, " +
            "licenses and major contracts, executive, director and " +
            "auditor changes, major-shareholder stake changes, " +
            "bankruptcy and delisting. Each row carries event_id, " +
            "ticker, event_class, event_type, axis (secondary " +
            "classification), source_category (the 8-K item or 13D/G " +
            "form), event_date, a one-sentence title, stage (announced / " +
            "approved / amended / completed / terminated), " +
            "event_group_id, accession_number, form_type, filing_url " +
            "and filing_date. Query by ticker, by date range, or both; " +
            "without a ticker it scans all companies. It returns the " +
            "shared fields only, not deal terms or amounts — read those " +
            "from the linked filing or with `/filing-search`.",
        docsUrl: "https://drillr.ai/docs/api/events",
        categories: ["equities", "company-news"],
        notes: [
            "US only. A China or Japan ticker is outside coverage and " +
            "returns 404.",
            "`from` / `to` filter `event_date`, whose meaning depends on " +
            "the event type and which can differ from `filing_date`.",
            "Only `event_class` can be filtered. `event_type` is a " +
            "response field: fetch the class and select the type on the " +
            "caller's side.",
            "Successive filings about the same real-world event share an " +
            "`event_group_id`; group rows by it to follow one deal or " +
            "financing through its stages. Only the latest version of " +
            "each event is returned.",
        ],
    },
    request: { method: "GET", path: "/events" },
    input: { schema: { queryParams: zEventsQueryParams } },
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
