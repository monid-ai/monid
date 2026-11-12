import { defineEndpoint } from "@shared/core";
import { zHandlePathParams, zNoQueryParams } from "../../schema/common.ts";

/**
 * `GET /user/about/{username}` — the data behind X's "About this account" panel for a handle.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) About This Account",
        summary:
            'The data behind X\'s "About this account" panel for a handle.',
        description:
            'Get the data behind X\'s "About this account" panel for a handle: the ' +
            "profile plus the account's based-in country, join date, username change " +
            "count and similar transparency fields. Use it to judge whether an " +
            "account is what it claims to be. For the plain profile use " +
            "twittrapi#user/by/username/{username}.",
        docsUrl: "https://www.twittrapi.com/docs/reference/user-about-username",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/about/{username}" },
    input: {
        schema: {
            pathParams: zHandlePathParams,
            queryParams: zNoQueryParams,
        },
    },
});
