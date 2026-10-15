import { z } from "zod";
import { zCount, zCursor } from "../../../schema/common.ts";

/** `GET /tweet/{tweetId}/quotes` query parameters — vendor mirror (D25). */
export const zTweetQuotesQueryParams = z.object({
    count: zCount.optional(),
    cursor: zCursor.optional(),
    rankingMode: z.string().describe(
        "Recency returns the newest quotes first (Latest tab); any other " +
            "value, or none, uses the Top tab.",
    ).optional(),
}).strict();
