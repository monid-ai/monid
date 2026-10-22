import { z } from "zod";
import { zUserTimelineQuery } from "../../../schema/common.ts";

/** `GET /user/{userId}/media` query parameters — vendor mirror (D25). */
export const zUserMediaQueryParams = z.object({
    ...zUserTimelineQuery,
}).strict();
