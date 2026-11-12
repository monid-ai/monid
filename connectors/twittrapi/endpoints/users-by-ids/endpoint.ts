import { defineEndpoint } from "@shared/core";
import { zUsersByIdsQueryParams } from "./schema/inputs.ts";

/**
 * `GET /user/users/by/ids` — up to 500 X profiles by numeric user ID in one call.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Profiles by IDs",
        summary: "Up to 500 X profiles by numeric user ID in one call.",
        description:
            "Look up to 500 X (Twitter) accounts by numeric user ID in one call and " +
            "get their public profiles as flat JSON (handle, name, bio, location, " +
            "counts, verification, images, created time). One call regardless of how " +
            "many IDs are passed. For a single account by handle use " +
            "twittrapi#user/by/username/{username}.",
        docsUrl: "https://www.twittrapi.com/docs/reference/user-users-by-ids",
        categories: ["twitter"],
        notes: [
            "IDs that do not resolve are left out of `data`; when none resolve, " +
            "`data` is empty (usage 0).",
        ],
    },
    request: { method: "GET", path: "/user/users/by/ids" },
    input: {
        schema: {
            queryParams: zUsersByIdsQueryParams,
        },
    },
});
