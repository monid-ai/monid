import { defineEndpoint } from "@shared/core";
import { zUserPathParams } from "../../schema/common.ts";
import { zUserFollowersQueryParams } from "./schema/inputs.ts";

/**
 * `GET /user/{userId}/followers` — accounts that follow a user, newest first, one page per call.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Followers",
        summary:
            "Accounts that follow a user, newest first, one page per call.",
        description:
            "List the accounts that follow an X (Twitter) user, newest first, one " +
            "page per call, as flat profiles (handle, name, bio, location, " +
            "follower/following counts, verification, created time). Page further " +
            "with `cursor`; pages usually hold more users than `count`. Only " +
            "blue-verified followers: twittrapi#user/{userId}/verified-followers; " +
            "accounts the user follows: twittrapi#user/{userId}/followings.",
        docsUrl:
            "https://www.twittrapi.com/docs/reference/user-userid-followers",
        categories: ["twitter"],
        notes: [
            'Pass the numeric `userId`, or `userId: "-1"` with `username` set to a ' +
            "handle; the handle costs no extra call.",
        ],
    },
    request: { method: "GET", path: "/user/{userId}/followers" },
    input: {
        schema: {
            pathParams: zUserPathParams,
            queryParams: zUserFollowersQueryParams,
        },
    },
});
