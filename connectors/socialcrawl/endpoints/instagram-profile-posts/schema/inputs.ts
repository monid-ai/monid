import { z } from "zod";
import { zListFilters } from "../../../schema/list.ts";

/**
 * GET /v1/instagram/profile/posts query — the parameter table on
 * https://www.socialcrawl.dev/platforms/instagram/profile-posts plus
 * `cursor`, which is the name pagination says to send `next_cursor`
 * back as. Not strict: the vendor ignores an undeclared parameter and
 * names it in data._warnings, and the list surface keeps gaining flags.
 */
export const zInstagramProfilePostsQuery = z.object({
    handle: z.string().min(1).describe(
        "Instagram username without the @.",
    ),
    next_max_id: z.string().min(1).describe(
        "Legacy name for the next-page cursor. Prefer cursor, set to " +
            "pagination.next_cursor.",
    ).optional(),
    exclude_pinned: z.boolean().describe(
        "Leave out posts the owner pinned to the top of the grid. Same " +
            "price. Rows whose pin state is unknown are kept.",
    ).optional(),
    recent_days: z.number().int().min(1).max(3650).describe(
        "Keep only posts from the last N days, pinned ones included, and " +
            "stop the walk once a page reaches older posts.",
    ).optional(),
    include: z.string().min(1).describe(
        "audio adds the sound on each video (1 extra credit per video " +
            "filled, at most 12). tags adds tagged usernames (1 extra " +
            "credit per post that names someone, at most 12). Combine as " +
            "audio,tags. A page then costs at most 25 credits before labels.",
    ).optional(),
    ...zListFilters,
});
