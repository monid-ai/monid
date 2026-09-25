import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEventsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Events",
        summary: "List events (games/matches) with schedule and status.",
        description:
            "List events (games and matches) filtered by sport, league, status, date, team, or season. Returns each event's participants, start time, and status; set include_scores for live and final scores. Cursor-paginate with after_id.",
        docsUrl: "https://lumify.ai/docs",
        categories: ["sports-data"],
    },
    request: { method: "GET", path: "/events" },
    input: { schema: { queryParams: zEventsQueryParams } },
    usage: {
        /** One credit per call against the account's Lumify credit pool. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "event lists",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
