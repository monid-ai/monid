import { z } from "zod";
import { zCount, zCursor, zListId } from "../../../schema/common.ts";

/** `GET /lists/members` query parameters — vendor mirror (D25). */
export const zListMembersQueryParams = z.object({
    listId: zListId,
    count: zCount.optional(),
    cursor: zCursor.optional(),
}).strict();
