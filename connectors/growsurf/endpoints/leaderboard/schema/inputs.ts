import { z } from "zod";
import { zPagingQueryParams } from "../../../schema/common.ts";

/**
 * `GET /campaign/{id}/leaderboard` query parameters.
 *
 * The deprecated `isMonthly` boolean is NOT mirrored: GrowSurf supersedes
 * it with `leaderboardType: CURRENT_MONTH`, which says the same thing and
 * is the spelling the vendor documents going forward.
 */
const LEADERBOARD_TYPES = [
    "ALL_TIME",
    "CURRENT_MONTH",
    "PREV_MONTH",
    "TOTAL_IMPRESSION_COUNT",
    "UNIQUE_IMPRESSION_COUNT",
    "BY_COMMISSIONS",
    "BY_REVENUE",
    "BY_REFERRALS",
    "BY_LEADS",
] as const;

export const zLeaderboardQueryParams = z.object({
    ...zPagingQueryParams.shape,
    leaderboardType: z.enum(LEADERBOARD_TYPES).optional().describe(
        "What to rank by. `ALL_TIME` (the default) and `BY_REFERRALS` " +
            "rank by referrals; `CURRENT_MONTH` and `PREV_MONTH` rank by " +
            "referrals inside that calendar month; `BY_LEADS` ranks by " +
            "leads; `TOTAL_IMPRESSION_COUNT` and " +
            "`UNIQUE_IMPRESSION_COUNT` rank by referral-link views; " +
            "`BY_COMMISSIONS` and `BY_REVENUE` rank affiliates by what " +
            "they earned and by the sales they drove, and apply to " +
            "affiliate programs.",
    ),
});
