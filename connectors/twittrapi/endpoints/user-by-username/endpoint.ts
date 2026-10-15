import { defineEndpoint } from "@shared/core";
import { zHandlePathParams, zNoQueryParams } from "../../schema/common.ts";

/**
 * `GET /user/by/username/{username}` — one X profile by handle, including its numeric user ID.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get an X (Twitter) Profile by Handle",
        summary: "One X profile by handle, including its numeric user ID.",
        description:
            "Look up an X (Twitter) account by handle and get its public profile as " +
            "flat JSON: numeric user ID, name, bio, location, website, " +
            "follower/following/tweet/media/like counts, verification, profile and " +
            "banner images, created time and pinned tweet ids. The user ID is what " +
            "the per-user endpoints (tweets, media, followers, following) take. For " +
            "up to 100 profiles by ID in one call use twittrapi#user/users/by/ids; " +
            'for the "About this account" panel use twittrapi#user/about/{username}.',
        docsUrl:
            "https://www.twittrapi.com/docs/reference/user-by-username-username",
        categories: ["twitter"],
        notes: [
            "A handle that does not exist returns `data: null` (usage 0).",
        ],
    },
    request: { method: "GET", path: "/user/by/username/{username}" },
    input: {
        schema: {
            pathParams: zHandlePathParams,
            queryParams: zNoQueryParams,
        },
    },
});
