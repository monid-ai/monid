import { z } from "zod";

/** GET /api/open/v1/podcasts/{seq}/episodes */
export const zPodcastEpisodesPathParams = z.object({
    seq: z.string().regex(/^[1-9]\d*$/).describe(
        'Podwise podcast (show) sequence number, as a decimal string (e.g. "1396"), from Search Podcasts.',
    ),
});

export const zPodcastEpisodesQueryParams = z.object({
    date: z.iso.date().optional().describe(
        "Last day of the window, YYYY-MM-DD. Defaults to today.",
    ),
    days: z.number().int().min(1).max(365).optional().describe(
        "How many days back from date, 1-365. Defaults to 7.",
    ),
});
