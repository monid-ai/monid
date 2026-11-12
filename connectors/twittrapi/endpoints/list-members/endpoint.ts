import { defineEndpoint } from "@shared/core";
import { zListMembersQueryParams } from "./schema/inputs.ts";

/**
 * `GET /lists/members` — accounts that are members of an X List, one page per call.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) List Members",
        summary: "Accounts that are members of an X List, one page per call.",
        description:
            "List the accounts on an X (Twitter) List, one page per call, as flat " +
            "profiles (handle, name, bio, counts, verification). Page further with " +
            "`cursor`. For the list's tweets use twittrapi#lists/tweets.",
        docsUrl: "https://www.twittrapi.com/docs/reference/lists-members",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/lists/members" },
    input: {
        schema: {
            queryParams: zListMembersQueryParams,
        },
    },
});
