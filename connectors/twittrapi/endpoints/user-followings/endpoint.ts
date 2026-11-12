import { defineEndpoint } from "@shared/core";
import { zUserPathParams } from "../../schema/common.ts";
import { zUserFollowingsQueryParams } from "./schema/inputs.ts";

/**
 * `GET /user/{userId}/followings` — accounts a user follows, one page per call.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Following",
        summary: "Accounts a user follows, one page per call.",
        description:
            "List the accounts an X (Twitter) user follows, one page per call, as " +
            "flat profiles (handle, name, bio, location, counts, verification, " +
            "created time). Page further with `cursor`. For the user's followers use " +
            "twittrapi#user/{userId}/followers.",
        docsUrl:
            "https://www.twittrapi.com/docs/reference/user-userid-followings",
        categories: ["twitter"],
        notes: [
            'Pass the numeric `userId`, or `userId: "-1"` with `username` set to a ' +
            "handle; the handle costs no extra call.",
        ],
    },
    request: { method: "GET", path: "/user/{userId}/followings" },
    input: {
        schema: {
            pathParams: zUserPathParams,
            queryParams: zUserFollowingsQueryParams,
        },
    },
});
