import { z } from "zod";
import { zCursor, zUserFilters, zUserId } from "../../../schema/common.ts";

/** `GET /x/users/{id}/following` path, mirrored from https://xquik.com/openapi.yaml
 *  (`getUserFollowing`, 2026-11-14). */
export const zUserFollowingPathParams = z.object({ id: zUserId });

/**
 * `GET /x/users/{id}/following` query (`user-profile-coverage-parameters`).
 * The object is strict, so only the declared filters reach Xquik.
 */
export const zUserFollowingQueryParams = zUserFilters.extend({
    cursor: zCursor.optional(),
    pageSize: z.number().int().min(1).max(10000).describe(
        "Most profiles to return, 1 to 10,000. Follow next_cursor for more.",
    ).optional(),
}).strict();
