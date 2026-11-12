import { z } from "zod";
import { defineEndpoint } from "@shared/core";
import { zSearchQueryParams } from "./schema/inputs.ts";

/**
 * `GET /search` — search tweets or people on X with the full X search syntax, one page per call.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search X (Twitter) Tweets",
        summary:
            "Search tweets or people on X with the full X search syntax, one page per " +
            "call.",
        description:
            "Search X (Twitter) the way the X search box does and get one page of " +
            "results as flat JSON. `searchItem` takes the X query syntax (from:, to:, " +
            "lang:, since:, until:, min_faves:, filter:, quoted phrases, OR); the " +
            "optional `filters` object adds the same operators for you (language, " +
            "date window, minimum likes, replies on or off, links/media/video only, " +
            "verified only, accounts, hashtags). `category` picks the tab: Top " +
            "(default), Latest, People (returns users instead of tweets), Photos or " +
            "Videos. Each tweet carries its text, timestamps, engagement counts, " +
            "media, language and the author's profile. Page further with `cursor` = " +
            "the previous `nextCursor`. For one account's own timeline use " +
            "twittrapi#user/{userId}/tweets; for one tweet's replies use " +
            "twittrapi#tweet/{tweetId}.",
        docsUrl: "https://www.twittrapi.com/docs/reference/search",
        categories: ["twitter"],
        notes: [
            "Pass `searchItem`, `filters`, or both. `searchItem` plus the encoded " +
            "`filters` may be at most 512 characters.",
            "Mutually exclusive filter pairs (for example `removeReplies` and " +
            "`onlyReplies`) answer 422 when both are true; a `word:` operator the API " +
            "does not know answers 422 as well.",
            "An empty page from X is retried by the vendor up to 9 times; a search " +
            "that still finds nothing returns an empty `data` (usage 0) or a 502 " +
            "(provider error, usage 0).",
        ],
    },
    request: { method: "GET", path: "/search" },
    input: {
        schema: {
            queryParams: z.union([
                zSearchQueryParams.required({ searchItem: true }),
                zSearchQueryParams.required({ filters: true }),
            ]).describe("Provide searchItem, filters, or both."),
        },
    },
});
