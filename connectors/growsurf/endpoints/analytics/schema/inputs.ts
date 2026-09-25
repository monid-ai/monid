import { z } from "zod";

/**
 * `GET /campaign/{id}/analytics` query parameters.
 *
 * PORT NOTE: the window is either `days` OR the `startDate`/`endDate` pair
 * — a cross-field rule that cannot survive `z.toJSONSchema`, so it is a
 * documented constraint on the fields themselves. GrowSurf rejects an
 * invalid combination with a 400.
 */
const INTERVALS = ["day", "week", "month", "total"] as const;
const PLATFORMS = ["ALL", "WEB", "IOS", "ANDROID"] as const;

/** GrowSurf's documented ceiling on `days` — five years. */
const MAX_DAYS = 1825;

export const zAnalyticsQueryParams = z.object({
    days: z.number().int().min(1).max(MAX_DAYS).optional().describe(
        "How many days back to report, ending now. 1-1825, defaults to " +
            "365. Use this OR the startDate/endDate pair, not both.",
    ),
    startDate: z.number().int().optional().describe(
        "Start of the window, as a Unix timestamp in milliseconds. " +
            "Required together with endDate when `days` is not set.",
    ),
    endDate: z.number().int().optional().describe(
        "End of the window, as a Unix timestamp in milliseconds. " +
            "Required together with startDate when `days` is not set.",
    ),
    interval: z.enum(INTERVALS).optional().describe(
        "Set `day`, `week` or `month` to also get a `series` array of " +
            "per-period totals. Defaults to `total`, which returns the " +
            "totals alone.",
    ),
    include: z.string().min(1).optional().describe(
        "Comma-separated extras to add to the response: " +
            "`previousPeriod` (the same-length window immediately " +
            "before, for comparison), `statusCounts` (reward status, and " +
            "for an affiliate program the affiliate, commission and " +
            "payout status breakdowns), `rates` (derived referral " +
            "conversion, participation and shares-per-participant), " +
            "`email` (sent, delivered, opened, clicked, bounced and spam " +
            "complaints, plus per-email-type figures) and `engagement` " +
            "(unique active, sharing, repeat and retained participants, " +
            "with platform, source and channel breakdowns). Example: " +
            "previousPeriod,rates.",
    ),
    timezone: z.string().min(1).optional().describe(
        "IANA timezone for engagement day boundaries, for example " +
            "America/Los_Angeles. Defaults to UTC. Read only when " +
            "`include` contains `engagement`.",
    ),
    platform: z.enum(PLATFORMS).optional().describe(
        "Limit engagement events to one client platform. Defaults to " +
            "`ALL`. Read only when `include` contains `engagement`.",
    ),
});
