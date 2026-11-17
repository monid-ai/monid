import { z } from "zod";
import { zUserTimelineQuery } from "../../../schema/common.ts";

/** `GET /user/{userId}/followings` query parameters — vendor mirror (D25). */
export const zUserFollowingsQueryParams = z.object({
    ...zUserTimelineQuery,
}).strict();
