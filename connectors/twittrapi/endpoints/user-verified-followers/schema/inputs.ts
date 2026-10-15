import { z } from "zod";
import { zUserTimelineQuery } from "../../../schema/common.ts";

/** `GET /user/{userId}/verifiedFollowers` query parameters — vendor mirror (D25). */
export const zUserVerifiedFollowersQueryParams = z.object({
    ...zUserTimelineQuery,
}).strict();
