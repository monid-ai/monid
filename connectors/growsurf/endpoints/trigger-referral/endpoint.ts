import { defineEndpoint } from "@shared/core";
import { zParticipantPathParams } from "../../schema/common.ts";
import { zTriggerReferralBody } from "./schema/inputs.ts";

/**
 * `POST /campaign/{id}/participant/{participantIdOrEmail}/ref` — credit the
 * referral of an already-referred participant.
 *
 * NOT an exception on a repeat: an already-credited referral answers 200
 * with `success: false` and a message saying so. So `success` is the field
 * to branch on, not the HTTP status — worth saying plainly, because "200"
 * alone does not mean "credited this time".
 */
export default defineEndpoint({
    meta: {
        displayName: "Credit a Referral",
        summary: "Credit a referral for someone who was referred, now or " +
            "after a waiting period.",
        description: "Credit the referral of a participant who was " +
            "referred by someone else — this is how a program that counts " +
            "a real action (a purchase, an activation, a verified signup) " +
            "tells GrowSurf the action happened, so the referrer gets " +
            "credit and any reward they are owed. Name the REFERRED " +
            "participant, by id or email address, not the referrer. Send " +
            "`{}` to credit immediately, or `delayInDays` to hold the " +
            "credit through your refund window first; a held credit is " +
            "awarded on its own once the delay elapses. The answer is " +
            "`{success, message}`, always with HTTP 200 — a referral that " +
            "was already credited comes back with `success: false` and a " +
            "message saying so, so read `success` rather than the status.",
        docsUrl: "https://docs.growsurf.com/developer-tools/rest-api/" +
            "api-reference#post-campaign-id-participant-" +
            "participantidoremail-ref",
        categories: ["referrals"],
        notes: [
            "The participant you name is the one who WAS REFERRED. " +
            "Naming the referrer credits nothing.",
            "A repeat answers 200 with `success: false`, not an error. " +
            "Branch on `success`.",
            "Send `{}` as the body to credit immediately — an ABSENT body " +
            "is refused before the request is sent, even though GrowSurf " +
            "itself would accept one.",
        ],
    },
    request: {
        method: "POST",
        path: "/campaign/{id}/participant/{participantIdOrEmail}/ref",
    },
    input: {
        schema: {
            pathParams: zParticipantPathParams,
            body: zTriggerReferralBody,
        },
    },
});
