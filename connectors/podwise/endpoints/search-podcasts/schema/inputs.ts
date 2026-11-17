import { z } from "zod";

/** GET /api/open/v1/podcasts/search */
export const zSearchPodcastsQueryParams = z.object({
    q: z.string().min(1).describe(
        "Podcast (show) name, host or topic to search for, in any supported language.",
    ),
    page: z.number().int().min(0).optional().describe(
        "Zero-based page index.",
    ),
    hitsPerPage: z.number().int().min(1).max(30).optional()
        .describe(
            "Results per page, 1-30.",
        ),
});
