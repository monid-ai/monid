import { defineEndpoint } from "@shared/core";
import { zParticipantPathParams } from "../../schema/common.ts";

/**
 * `GET /campaign/{id}/participant/{participantIdOrEmail}` — one
 * participant, by either handle.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Participant",
        summary: "Look one participant up by id or email address.",
        description: "Read one participant by GrowSurf participant id or " +
            "by their email address — either resolves, so you can look " +
            "someone up from your own records without storing a GrowSurf " +
            "id. Returns their `shareUrl` (their referral link), who " +
            "referred them (`referrer`, `referredBy`, `referralSource` " +
            "and `referralStatus`), how many people they have brought in " +
            "(`referralCount`, `leadCount`, and the ids under " +
            "`referrals`), their `rank` and `monthlyRank`, per-network " +
            "`shareCount`, referral-link views, `fraudRiskLevel` and " +
            "`fraudReasonCode`, whether they are `unsubscribed`, any " +
            "`metadata` you stored, the rewards they have earned, and — " +
            "in an affiliate program — `isAffiliate`, `affiliateStatus`, " +
            "and what their payout setup still needs under " +
            "`payoutSettings.requiredActions`.",
        docsUrl: "https://docs.growsurf.com/developer-tools/rest-api/" +
            "api-reference#get-campaign-id-participant-participantidoremail",
        categories: ["referrals"],
        notes: [
            "An email address in the path must be URL-encoded. The engine " +
            "encodes path parameters for you — pass the plain address.",
            "An unknown participant answers 400 with code " +
            "`PARTICIPANT_NOT_FOUND`, not 404.",
        ],
    },
    request: {
        method: "GET",
        path: "/campaign/{id}/participant/{participantIdOrEmail}",
    },
    input: { schema: { pathParams: zParticipantPathParams } },
});
