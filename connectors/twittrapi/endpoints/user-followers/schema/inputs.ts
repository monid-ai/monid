import { z } from "zod";
import { zUserTimelineQuery } from "../../../schema/common.ts";

/** `GET /user/{userId}/followers` query parameters — vendor mirror (D25). */
export const zUserFollowersQueryParams = z.object({
    ...zUserTimelineQuery,
}).strict();
