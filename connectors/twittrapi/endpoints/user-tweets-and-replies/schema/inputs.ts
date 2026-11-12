import { z } from "zod";
import { zUserTimelineQuery } from "../../../schema/common.ts";

/** `GET /user/{userId}/tweetsAndReplies` query parameters — vendor mirror (D25). */
export const zUserTweetsAndRepliesQueryParams = z.object({
    ...zUserTimelineQuery,
}).strict();
