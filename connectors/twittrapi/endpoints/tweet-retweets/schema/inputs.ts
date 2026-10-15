import { z } from "zod";
import { zCount, zCursor } from "../../../schema/common.ts";

/** `GET /tweet/{tweetId}/retweets` query parameters — vendor mirror (D25). */
export const zTweetRetweetsQueryParams = z.object({
    count: zCount.optional(),
    cursor: zCursor.optional(),
    rankingMode: z.string().describe(
        "Recency turns X's ranking off; any other value, or none, keeps it " +
            "on.",
    ).optional(),
}).strict();
