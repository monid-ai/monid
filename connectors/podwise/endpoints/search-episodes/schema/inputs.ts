import { z } from "zod";

/** GET /api/open/v1/episodes/search */
export const zSearchEpisodesQueryParams = z.object({
    q: z.string().min(1).describe(
        "Topic, guest or company to search for, in any supported language.",
    ),
    page: z.number().int().min(0).optional().default(0).describe(
        "Zero-based page index.",
    ),
    hitsPerPage: z.number().int().min(1).max(30).optional().default(20)
        .describe(
            "Results per page, 1-30. Defaults to 20.",
        ),
});
