import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zUsersSearchQueryParams } from "./schema/inputs.ts";

/** GET /x/users/search, X (Twitter) profile search. */
export default defineEndpoint({
    meta: {
        displayName: "Search X (Twitter) Users",
        summary: "Search X (Twitter) profiles by name or username.",
        description: "Search public X (Twitter) profiles by name or " +
            "username. Each profile carries its bio, follower & following " +
            "counts, verification & avatar. Filter by follower count, " +
            "verification, bio, location & website. Filtered-out profiles " +
            "cost nothing. Use xquik#x/users/{id} when you know the " +
            "username.",
        docsUrl: "https://docs.xquik.com/api-reference/x/search-users",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/x/users/search" },
    input: {
        schema: {
            queryParams: zUsersSearchQueryParams.extend({
                pageSize: zUsersSearchQueryParams.shape.pageSize.unwrap()
                    .default(20),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "profiles",
            description: "profiles returned",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.queryParams.pageSize },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.optionalGet(
                        data.lifecycle?.state ?? null,
                        "$.data.creditsCharged",
                    ) === 0
                    ? 0
                    : utils.json.len(data.output, "$.users"),
            },
        }),
    },
});
