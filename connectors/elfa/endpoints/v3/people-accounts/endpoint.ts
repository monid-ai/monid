import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zV3PeopleAccountsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Top Accounts",
        summary:
            "Accounts to watch, ranked by standing or by their record as callers.",
        description:
            "Who to watch. By default ranked by standing: how much other " +
            "accounts reply to, quote and repost an account, newer " +
            "engagement counting more. Or ranked by its record as a " +
            "caller, the numbers in its `track`: `alphaScore`, `hitRate` " +
            "or `avgReturn`. These rank only accounts with at least 20 " +
            "scored (closed) positions, so a few lucky calls cannot top " +
            "the list, and break ties by more scored positions. They " +
            "cover every position since June 2026. `avgReturn` is not " +
            "adjusted for the market, so it favours whoever was long in a " +
            "rally; `alphaScore` is. Both rankings refresh daily. An " +
            "account we cannot name is left out rather than ranked blind, " +
            "so ranks are dense. Each account carries its `standing` (a 0 " +
            "to 1 percentile), its display name, follower count and " +
            "verified flag, and `track`, its record as a caller (null " +
            "when it has never opened a position).",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/top-accounts",
        categories: ["twitter", "crypto-signals"],
        notes: [
            "For `metric=standing`, 5 credits for `limit` up to 50 and 10 " +
            "up to 200; for `alphaScore`, `hitRate` and `avgReturn`, 25 " +
            "and 50.",
        ],
    },
    request: { method: "GET", path: "/v3/people/accounts" },
    input: {
        schema: {
            queryParams: zV3PeopleAccountsQueryParams.extend({
                limit: zV3PeopleAccountsQueryParams.shape.limit.unwrap()
                    .default(50),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                standing_up_to_50: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "standing, up to 50",
                    description: "metric=standing with limit up to 50",
                    consumes: { credit: "default", amount: 5 },
                },
                standing_up_to_200: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "standing, up to 200",
                    description: "metric=standing with limit 51 to 200",
                    consumes: { credit: "default", amount: 10 },
                },
                track_up_to_50: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "track record, up to 50",
                    description:
                        "metric alphaScore, hitRate or avgReturn with limit up to 50",
                    consumes: { credit: "default", amount: 25 },
                },
                track_up_to_200: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "track record, up to 200",
                    description:
                        "metric alphaScore, hitRate or avgReturn with limit 51 to 200",
                    consumes: { credit: "default", amount: 50 },
                },
            },
        },
        estimate: ({ data }) => {
            const query = data.input.queryParams;
            const limit = query?.limit ?? 0;
            const standing = query?.metric === undefined ||
                query.metric === "standing";
            return {
                counts: {
                    standing_up_to_50: standing && limit <= 50 ? 1 : 0,
                    standing_up_to_200: standing && limit > 50 ? 1 : 0,
                    track_up_to_50: !standing && limit <= 50 ? 1 : 0,
                    track_up_to_200: !standing && limit > 50 ? 1 : 0,
                },
            };
        },
        evidence: ({ data }) => {
            const query = data.input.queryParams;
            const limit = query?.limit ?? 0;
            const standing = query?.metric === undefined ||
                query.metric === "standing";
            return {
                counts: {
                    standing_up_to_50: standing && limit <= 50 ? 1 : 0,
                    standing_up_to_200: standing && limit > 50 ? 1 : 0,
                    track_up_to_50: !standing && limit <= 50 ? 1 : 0,
                    track_up_to_200: !standing && limit > 50 ? 1 : 0,
                },
            };
        },
    },
});
