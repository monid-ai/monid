import { z } from "zod";
import { zCount, zCursor, zListId } from "../../../schema/common.ts";

/** `GET /lists/tweets` query parameters — vendor mirror (D25). */
export const zListTweetsQueryParams = z.object({
    listId: zListId,
    count: zCount.optional(),
    cursor: zCursor.optional(),
}).strict();
