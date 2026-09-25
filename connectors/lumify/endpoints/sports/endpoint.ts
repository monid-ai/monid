import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSportsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "List Sports",
        summary: "List the sports Lumify covers.",
        description:
            "List every sport Lumify covers, with its slug and display name. Use the slug to filter events, teams, and players.",
        docsUrl: "https://lumify.ai/docs",
        categories: ["sports-data"],
    },
    request: { method: "GET", path: "/sports" },
    input: { schema: { queryParams: zSportsQueryParams } },
    usage: {
        /** One credit per call against the account's Lumify credit pool. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "sports lookups",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
