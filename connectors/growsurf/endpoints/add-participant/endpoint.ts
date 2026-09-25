import { defineEndpoint } from "@shared/core";
import { zCampaignPathParams } from "../../schema/common.ts";
import { zAddParticipantBody } from "./schema/inputs.ts";

/**
 * `POST /campaign/{id}/participant` — enroll someone, get their referral
 * link back.
 *
 * IDEMPOTENT ON EMAIL, which is what makes it safe for an agent to call:
 * re-posting an address that is already enrolled returns the existing
 * participant unchanged rather than creating a second record or a second
 * referral link.
 *
 * Identity is the bare `/participant` path, so it does not collide with
 * `#campaign/{id}/participant/{participantIdOrEmail}` (design D22).
 */
export default defineEndpoint({
    meta: {
        displayName: "Add Participant",
        summary: "Enroll someone in a program and get their referral link.",
        description: "Add a person to a program by email address and get " +
            "their participant record back, including `shareUrl` — the " +
            "referral link they share, which is the thing most callers " +
            "are here for. Set `referredBy` to the referrer's " +
            "participant id or email address to record who referred them. " +
            "In an affiliate program, `isAffiliate: true` enrolls them as " +
            "an approved affiliate. Safe to repeat: an email address that " +
            "is already enrolled comes back unchanged, with its existing " +
            "link, rather than being added twice. This is MANUAL " +
            "enrollment — it preserves attribution, but it does not by " +
            "itself qualify a lead-event reward or commission; credit a " +
            "referral with growsurf#campaign/{id}/participant/" +
            "{participantIdOrEmail}/ref when the action you count happens.",
        docsUrl: "https://docs.growsurf.com/developer-tools/rest-api/" +
            "api-reference#post-campaign-id-participant",
        categories: ["referrals"],
        notes: [
            "A participant GrowSurf has blocked answers 422 rather than " +
            "enrolling. The response body names the reason.",
        ],
    },
    /** PUBLIC identity (design D22): the vendor's own path, which is
     *  already distinct from the `{participantIdOrEmail}` read below. */
    request: { method: "POST", path: "/campaign/{id}/participant" },
    input: {
        schema: {
            pathParams: zCampaignPathParams,
            body: zAddParticipantBody,
        },
    },
});
