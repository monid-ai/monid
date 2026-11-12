import { defineEndpoint } from "@shared/core";
import { zUserPathParams } from "../../schema/common.ts";
import { zUserMediaQueryParams } from "./schema/inputs.ts";

/**
 * `GET /user/{userId}/media` — a profile's tweets with photos or videos, one page per call.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) User Media",
        summary: "A profile's tweets with photos or videos, one page per call.",
        description:
            "Read the tweets with photos or videos from an X (Twitter) profile, one " +
            "page per call, with media URLs, types and sizes alongside the tweet text " +
            "and counts. Page further with `cursor`. For all tweets use " +
            "twittrapi#user/{userId}/tweets.",
        docsUrl: "https://www.twittrapi.com/docs/reference/user-userid-media",
        categories: ["twitter"],
        notes: [
            'Pass the numeric `userId`, or `userId: "-1"` with `username` set to a ' +
            "handle; the handle costs no extra call.",
        ],
    },
    request: { method: "GET", path: "/user/{userId}/media" },
    input: {
        schema: {
            pathParams: zUserPathParams,
            queryParams: zUserMediaQueryParams,
        },
    },
});
