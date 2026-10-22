import { z } from "zod";
import { zUserTimelineQuery } from "../../../schema/common.ts";

/** `GET /user/{userId}/tweets` query parameters — vendor mirror (D25). */
export const zUserTweetsQueryParams = z.object({
    ...zUserTimelineQuery,
    includePromotedContent: z.boolean().describe(
        "Ask X to include promoted tweets (vendor default false).",
    ).optional(),
}).strict();
