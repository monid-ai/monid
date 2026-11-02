import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zReversePhoneBody } from "./schema/inputs.ts";

/**
 * `POST /data/people/reverse-phone` — who a phone number belongs to.
 *
 * SYNC, like the reverse email lookup: one lookup inside the request, which
 * answers `504`, charging nothing, when nothing came back in time. A
 * company's number (its front desk) names nobody.
 *
 * THE RECEIPT SETTLES IT: `creditsCharged` is the plan price when someone
 * was found and 0 otherwise, and the provider's evidence reads it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Person by Phone",
        summary:
            "Find who a phone number belongs to: their LinkedIn profile, name, current job and company.",
        description: "Find the person a phone number belongs to: their " +
            "LinkedIn profile, name, current job and company. Charged only " +
            "when someone is found; a miss is free. Send `phone`, best with " +
            "its country code, e.g. `+14155550123`; spaces, dashes and " +
            "brackets are fine, and a number without a country code is read " +
            "as a US number. The answer carries `status` (`found` or " +
            "`not_found`) and `person`: null when nobody was found, else " +
            "`linkedinMemberId`, `linkedin_url`, names, the current job " +
            "(title, seniority, department, employer name, domain and " +
            "industry), a lower-case location, summary, job history and a " +
            "picture link. A company's main number names nobody. Next: pass " +
            "`person.linkedin_url` to `fuse#data/people/email` for a work " +
            "email.",
        categories: ["people-enrichment"],
        notes: [
            "A number that reads as no phone number, even as a US one, " +
            "answers 422 PHONE_NUMBER_INVALID, charged nothing.",
            "Nothing found in time answers 504 and charges nothing: retry.",
        ],
    },
    request: { method: "POST", path: "/data/people/reverse-phone" },
    input: { schema: { body: zReversePhoneBody } },
    usage: {
        /** Metered in Fuse's own credits; the provider's evidence reads the
         *  receipt, so a miss settles the zero Fuse charged for it. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "person found",
            description: "what the lookup drew, as Fuse's own receipt says",
        },
        /** One person found, at the plan's `people_reverse_phone` price. */
        estimate: () => ({ counts: { CREDIT: 2 } }),
    },
});
