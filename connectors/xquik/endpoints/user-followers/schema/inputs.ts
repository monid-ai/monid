import { z } from "zod";
import { zCursor, zUserFilters, zUserId } from "../../../schema/common.ts";

/** `GET /x/users/{id}/followers` path, mirrored from https://xquik.com/openapi.yaml
 *  (`getUserFollowers`, 2026-11-14). */
export const zUserFollowersPathParams = z.object({ id: zUserId });

/**
 * `GET /x/users/{id}/followers` query (`user-profile-coverage-parameters`).
 * The object is strict, so only the declared filters reach Xquik.
 */
export const zUserFollowersQueryParams = zUserFilters.extend({
    cursor: zCursor.optional(),
    pageSize: z.number().int().min(1).max(10000).describe(
        "Most profiles to return, 1 to 10,000. Follow next_cursor for more.",
    ).optional(),
}).strict();
