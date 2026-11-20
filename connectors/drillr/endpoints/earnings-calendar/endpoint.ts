import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEarningsCalendarQueryParams } from "./schema/inputs.ts";

/** GET /earnings-calendar — who reports on which day, by date window. */
export default defineEndpoint({
    meta: {
        displayName: "Get Earnings Calendar",
        summary: "Earnings announcements in a date window, with EPS and " +
            "revenue estimates and actuals.",
        description: "List earnings announcements across the US, China " +
            "and Japan for a window of announcement dates, one row per " +
            "company per announcement, sorted by date then ticker: " +
            "ticker, date, eps_actual, eps_estimated, revenue_actual, " +
            "revenue_estimated and last_updated. Use it to see who " +
            "reports in a given week, or to read the consensus and the " +
            "reported figure for a past announcement. It is queried by " +
            "date only — there is no ticker filter — so to find one " +
            "company's date, request the window and select its row.",
        docsUrl: "https://drillr.ai/docs/api/earnings-calendar",
        categories: ["equities"],
        notes: [
            "`from` and `to` are both required and the window may span " +
            "at most 90 days; a longer window, or `to` before `from`, " +
            "returns 400.",
            "A busy window holds thousands of rows across three markets. " +
            "Page with `limit` (maximum 500) and `page` until a page " +
            "comes back shorter than `limit`.",
            "Actuals are null until the company has reported and the " +
            "figure is ingested; estimates can be null as well.",
            "Rows carry no currency field: amounts are in the trading " +
            "currency of the listing venue.",
            "`eps_actual` follows the calendar source's normalized basis " +
            "and can differ from `eps_basic` on `/income-statements`.",
        ],
    },
    request: { method: "GET", path: "/earnings-calendar" },
    input: { schema: { queryParams: zEarningsCalendarQueryParams } },
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
