import { z } from "zod";
import { zTweetFilters, zUserId } from "../../../schema/common.ts";

/** `GET /x/users/{id}/tweets` path (`UserPathId`). */
export const zUserTweetsPathParams = z.object({ id: zUserId });

/**
 * `GET /x/users/{id}/tweets` query, mirrored from
 * https://xquik.com/openapi.yaml (`getUserTweets`, 2026-11-14). The object
 * is strict, since Xquik prices some undeclared filters, such as topic,
 * above the read price.
 */
export const zUserTweetsQueryParams = zTweetFilters.extend({
    pageSize: z.number().int().min(1).max(10000).describe(
        "Most tweets to return, 1 to 10,000. Follow next_cursor for more.",
    ).optional(),
    includeReplies: z.boolean().describe(
        "Include the account's replies. Off by default.",
    ).optional(),
    includeParentTweet: z.boolean().describe(
        "Attach each reply's parent tweet as parentTweet.",
    ).optional(),
    replies: z.enum(["include", "exclude", "only"]).describe(
        "Replies to include, exclude or return alone. exclude keeps " +
            "replies inside the account's own threads.",
    ).optional(),
}).strict();
