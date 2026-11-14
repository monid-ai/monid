import { z } from "zod";
import { zCursor, zUserFilters } from "../../../schema/common.ts";

/**
 * `GET /x/users/search` query, mirrored from https://xquik.com/openapi.yaml
 * (`searchUsers`, 2026-11-14). The object is strict, so only the declared
 * filters reach Xquik.
 */
export const zUsersSearchQueryParams = zUserFilters.extend({
    q: z.string().min(1).max(4096).describe(
        "Name or username to search for.",
    ),
    cursor: zCursor.optional(),
    pageSize: z.number().int().min(1).max(100).describe(
        "Most profiles to return, 1 to 100. Follow next_cursor for more.",
    ).optional(),
}).strict();
