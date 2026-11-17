import { z } from "zod";
import { zListFilters } from "../../../schema/list.ts";

/**
 * GET /v1/tiktok/profile/videos query — the parameter table on
 * https://www.socialcrawl.dev/platforms/tiktok/profile-videos plus
 * `cursor`. Not strict, for the same reason as the Instagram list.
 * The endpoint requires handle or user_id (a union of required arms, so
 * a call with neither is INVALID_INPUT). Sending both is allowed.
 */
export const zTiktokProfileVideosQuery = z.object({
    handle: z.string().min(1).describe(
        "TikTok username without the @.",
    ).optional(),
    user_id: z.string().min(1).describe(
        "TikTok user id. Faster than a handle lookup. Profiles behind " +
            "TikTok's audience controls still resolve by handle.",
    ).optional(),
    sort_by: z.enum(["latest", "popular"]).describe(
        "Accepted and ignored. Videos come back in the source's order.",
    ).optional(),
    max_cursor: z.string().min(1).describe(
        "Cursor for the next page: a Unix timestamp in milliseconds, from " +
            "the previous response, or a start date of your choosing. " +
            "Prefer cursor when you are continuing a walk.",
    ).optional(),
    region: z.string().min(1).describe(
        "Country the request is routed through. Defaults to US. It does " +
            "not filter the videos; the video's country is post.ext.region.",
    ).optional(),
    format: z.literal("stationery").describe(
        "File each video into a stationery subject. No extra credits.",
    ).optional(),
    brief: z.string().min(1).describe(
        "With format=stationery, the subject the videos should be about. " +
            "A page about something else sets data.format_buckets.skip_creator.",
    ).optional(),
    ...zListFilters,
});
