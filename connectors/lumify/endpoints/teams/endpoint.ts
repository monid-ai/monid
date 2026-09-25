import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTeamsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Teams",
        summary: "List teams with league and location reference data.",
        description:
            "List teams filtered by sport, league, conference, division, or country, or search by name with q. Returns each team's id, name, and league placement. Cursor-paginate with after_id.",
        docsUrl: "https://lumify.ai/docs",
        categories: ["sports-data"],
    },
    request: { method: "GET", path: "/teams" },
    input: { schema: { queryParams: zTeamsQueryParams } },
    usage: {
        /** One credit per call against the account's Lumify credit pool. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "team lists",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
