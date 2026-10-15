import { z } from "zod";
import { zCursor } from "../../../schema/common.ts";

/** `GET /tweet/{tweetId}` query parameters — vendor mirror (D25). */
export const zTweetThreadQueryParams = z.object({
    rankingMode: z.enum(["Relevance", "Recency", "Likes"]).describe(
        "Order of the replies (vendor default Relevance).",
    ).optional(),
    includePromotedContent: z.boolean().describe(
        "Ask X to include promoted tweets (vendor default false).",
    ).optional(),
    cursor: zCursor.optional(),
}).strict();
