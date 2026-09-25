import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPlayersQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Players",
        summary: "List players with search and ranking filters.",
        description:
            "List players filtered by sport or country, or search by name with q. Set ranked to restrict to ranked players (e.g. tennis). Returns each player's id and identity. Cursor-paginate with after_id.",
        docsUrl: "https://lumify.ai/docs",
        categories: ["sports-data"],
    },
    request: { method: "GET", path: "/players" },
    input: { schema: { queryParams: zPlayersQueryParams } },
    usage: {
        /** One credit per call against the account's Lumify credit pool. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "player lists",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
