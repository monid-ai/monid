import { defineEndpoint } from "@shared/core";
import { zUserPathParams } from "../../schema/common.ts";
import { zUserVerifiedFollowersQueryParams } from "./schema/inputs.ts";

/**
 * `GET /user/{userId}/verifiedFollowers` — followers of a user that have a verified (blue) badge.
 *
 * Identity is pinned to `/user/{userId}/verified-followers`: endpoint ids are lowercase,
 * and the vendor's camelCase segment cannot be one (design D22).
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Verified Followers",
        summary: "Followers of a user that have a verified (blue) badge.",
        description:
            "List only the followers of an X (Twitter) user that carry a verified " +
            "(blue) badge, one page per call, as flat profiles. Useful to size an " +
            "account's notable audience without paging through every follower. Page " +
            "further with `cursor`. All followers: twittrapi#user/{userId}/followers.",
        docsUrl:
            "https://www.twittrapi.com/docs/reference/user-userid-verifiedfollowers",
        categories: ["twitter"],
        notes: [
            'Pass the numeric `userId`, or `userId: "-1"` with `username` set to a ' +
            "handle; the handle costs no extra call.",
        ],
    },
    endpoint: "/user/{userId}/verified-followers",
    request: { method: "GET", path: "/user/{userId}/verifiedFollowers" },
    input: {
        schema: {
            pathParams: zUserPathParams,
            queryParams: zUserVerifiedFollowersQueryParams,
        },
    },
});
