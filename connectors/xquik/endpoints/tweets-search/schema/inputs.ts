import { z } from "zod";
import { zTweetFilters } from "../../../schema/common.ts";

/**
 * `GET /x/tweets/search` query, mirrored from https://xquik.com/openapi.yaml
 * (`searchTweets`, 2026-11-14). The object is strict, since Xquik prices
 * some undeclared filters, such as topic, above the read price.
 */
export const zTweetSearchQueryParams = zTweetFilters.extend({
    q: z.string().max(4096).describe(
        "Search query, tweet ID or tweet URL. Takes X search operators " +
            "such as from:, to:, since:, until:, lang:, min_faves: and " +
            "filter:media. A hyphen negates a term.",
    ).optional(),
    queryType: z.string().max(32).describe(
        "Latest lists the newest tweets first. Top lists high-engagement " +
            "tweets first. Photos, Videos and Media keep tweets with that " +
            "media.",
    ).optional(),
    limit: z.number().int().min(1).max(10000).describe(
        "Most matching tweets to return, 1 to 10,000. Follow next_cursor " +
            "for more.",
    ).optional(),
    fromUser: z.string().max(19).describe(
        "Keep tweets by this username, reposts included.",
    ).optional(),
    toUser: z.string().max(19).describe(
        "Keep replies sent to this username.",
    ).optional(),
    mentioning: z.string().max(19).describe(
        "Keep tweets that mention this username.",
    ).optional(),
    replies: z.enum(["include", "exclude", "only"]).describe(
        "Replies to include, exclude or return alone.",
    ).optional(),
}).strict();
