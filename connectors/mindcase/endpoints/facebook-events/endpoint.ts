import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookEventsBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/events`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Facebook Events",
        summary:
            "Find Facebook events by keyword search or event URL. One row " +
            "per event with name, date, venue, host, attendance, and " +
            "ticket link.",
        description:
            "Find Facebook events by keyword search or event URL. One row " +
            "per event with name, date, venue, host, attendance, and " +
            "ticket link. Returns one row per event with eventName, " +
            "eventUrl, eventId, description, startDate, dateTime, " +
            "duration, frequency, isPast, isCanceled, isOnline, going, " +
            "interested, host, hosts, venueName, venueUrl, address, " +
            "street, city, country, latitude, longitude, category, " +
            "tickets, externalLinks, coverImageUrl, imageCaption, " +
            "occurrences. Find events by keyword search, or pull events " +
            "from specific Facebook event / explore / place URLs. $0.01 " +
            "per event; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/events",
        categories: ["facebook", "events"],
        notes: [
            "`maxResults` does not apply to `startUrls`: those return one " +
            "row per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/facebook/events",
    request: { method: "POST", path: "/v1/data/facebook/events/run" },
    input: {
        schema: {
            body: zFacebookEventsBody.extend({
                maxResults: zFacebookEventsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of events to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.searchQueries ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped =
                (body.startUrls ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
