import { defineEndpoint } from "@shared/core";
import { zCalendarPathParams, zCalendarQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/calendar/{currency} — scheduled release dates and times, nearest
 * first. `release` is the indicator slug the history endpoint takes.
 */
export default defineEndpoint({
    meta: {
        displayName: "FXMacroData Release Calendar",
        summary: "Upcoming economic release dates and times for a currency.",
        description: "Scheduled releases for a currency from the " +
            "publishers' own calendars, nearest first: the indicator " +
            "slug (`release`), the scheduled time in UTC and local time, " +
            "the reference period, importance (`event_importance`, " +
            "`market_tier`), and the schedule source. When a publisher " +
            "has announced only the date, the row says so " +
            "(`time_announced: false`) instead of guessing a time. Filter " +
            "by indicator and date range. USD works without an API key.",
        categories: ["economic-data"],
    },
    request: { method: "GET", path: "/v1/calendar/{currency}" },
    input: {
        schema: {
            pathParams: zCalendarPathParams,
            queryParams: zCalendarQueryParams,
        },
    },
});
