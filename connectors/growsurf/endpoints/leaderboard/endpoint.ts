import { defineEndpoint } from "@shared/core";
import { zCampaignPathParams } from "../../schema/common.ts";
import { zLeaderboardQueryParams } from "./schema/inputs.ts";

/**
 * `GET /campaign/{id}/leaderboard` — the same participant objects as
 * `#campaign/{id}/participants`, ordered by the chosen ranking instead of
 * by enrollment, and paged the same way.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Leaderboard",
        summary: "Rank a program's participants by referrals, leads, " +
            "commissions or revenue.",
        description: "List a program's participants in ranked order. " +
            "`leaderboardType` chooses the ranking: referrals all-time " +
            "(the default) or inside the current or previous calendar " +
            "month, leads, total or unique referral-link views, and — for " +
            "an affiliate program — `BY_COMMISSIONS` (what each affiliate " +
            "earned) or `BY_REVENUE` (the sales they drove). Returns the " +
            "same participant objects as " +
            "growsurf#campaign/{id}/participants, each with its `rank` and " +
            "`monthlyRank`, paged with the same `nextId` cursor and " +
            "`limit`. This is the endpoint for 'who are our top " +
            "advocates' and for building a public leaderboard; use " +
            "growsurf#campaign/{id}/participants when order does not " +
            "matter.",
        docsUrl: "https://docs.growsurf.com/developer-tools/rest-api/" +
            "api-reference#get-campaign-id-leaderboard",
        categories: ["referrals"],
    },
    request: { method: "GET", path: "/campaign/{id}/leaderboard" },
    input: {
        schema: {
            pathParams: zCampaignPathParams,
            queryParams: zLeaderboardQueryParams,
        },
    },
});
