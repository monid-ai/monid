import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import {
    zUserFollowingPathParams,
    zUserFollowingQueryParams,
} from "./schema/inputs.ts";

/** GET /x/users/{id}/following, the accounts 1 account follows. */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Following",
        summary: "List the profiles an X (Twitter) account follows.",
        description: "List the public profiles 1 X (Twitter) account " +
            "follows. Each profile carries its bio, " +
            "follower & following counts, verification & avatar. Filter " +
            "by follower count, verification, bio, location & website. " +
            "Filtered-out profiles cost nothing. Pages reach the end of " +
            "the list. Use xquik#x/users/{id}/followers for the reverse " +
            "direction.",
        docsUrl: "https://docs.xquik.com/api-reference/x/following",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/x/users/{id}/following" },
    input: {
        schema: {
            pathParams: zUserFollowingPathParams.extend({
                // A bare search or batch would route to Xquik's own
                // search/batch reads instead of this lookup.
                id: zUserFollowingPathParams.shape.id.regex(
                    /^(?!(?:search|batch)$)/,
                )
                    .describe(
                        "User ID, username with or without @, or profile URL such as " +
                            "x.com/nasa. A number reads as a user ID. Write " +
                            "@search or @batch for accounts with those names.",
                    ),
            }),
            queryParams: zUserFollowingQueryParams.extend({
                pageSize: zUserFollowingQueryParams.shape.pageSize.unwrap()
                    .default(200),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "profiles",
            description: "followed profiles returned",
            consumes: { credit: "default", amount: 0.00015 },
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.queryParams.pageSize },
        }),
        evidence: ({ data, utils }) => ({
            counts: { RESULT: utils.json.len(data.output, "$.users") },
        }),
    },
});
