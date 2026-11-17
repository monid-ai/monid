import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import {
    zUserFollowersPathParams,
    zUserFollowersQueryParams,
} from "./schema/inputs.ts";

/** GET /x/users/{id}/followers, the accounts that follow 1 account. */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Followers",
        summary: "List the profiles that follow an X (Twitter) account.",
        description: "List the public profiles that follow 1 X (Twitter) " +
            "account, newest first. Each follower carries its bio, " +
            "follower & following counts, verification & avatar. Filter " +
            "by follower count, verification, bio, location & website. " +
            "Filtered-out profiles cost nothing. Pages reach the end of " +
            "the list. Use xquik#x/users/{id} for 1 profile.",
        docsUrl: "https://docs.xquik.com/api-reference/x/followers",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/x/users/{id}/followers" },
    input: {
        schema: {
            pathParams: zUserFollowersPathParams.extend({
                // A bare search or batch would route to Xquik's own
                // search/batch reads instead of this lookup.
                id: zUserFollowersPathParams.shape.id.regex(
                    /^(?!(?:search|batch)$)/,
                )
                    .describe(
                        "User ID, username with or without @, or profile URL such as " +
                            "x.com/nasa. A number reads as a user ID. Write " +
                            "@search or @batch for accounts with those names.",
                    ),
            }),
            queryParams: zUserFollowersQueryParams.extend({
                pageSize: zUserFollowersQueryParams.shape.pageSize.unwrap()
                    .default(200),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "followers",
            description: "follower profiles returned",
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
