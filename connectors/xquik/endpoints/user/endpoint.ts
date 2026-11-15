import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserPathParams, zUserQueryParams } from "./schema/inputs.ts";

/** GET /x/users/{id}, 1 X (Twitter) profile. */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) User Profile",
        summary: "Read 1 X (Twitter) profile with counts & verification.",
        description: "Read 1 public X (Twitter) profile by username, user " +
            "ID or profile URL. The profile carries the bio, follower, " +
            "following & tweet counts, join date, verification & " +
            "avatar. It also carries the account's location, username " +
            "history & links its bio publishes. Use " +
            "xquik#x/users/{id}/followers for the accounts that follow it.",
        docsUrl:
            "https://docs.xquik.com/api-reference/x/twitter-profile-lookup",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/x/users/{id}" },
    input: {
        schema: {
            pathParams: zUserPathParams.extend({
                // A bare search or batch would route to Xquik's own
                // search/batch reads instead of this lookup.
                id: zUserPathParams.shape.id.regex(/^(?!(?:search|batch)$)/)
                    .describe(
                        "User ID, username with or without @, or profile URL such as " +
                            "x.com/nasa. A number reads as a user ID. Write " +
                            "@search or @batch for accounts with those names.",
                    ),
            }),
            queryParams: zUserQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 1 },
        },
    },
});
