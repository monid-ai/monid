import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPerson } from "../../schema/person.ts";

/**
 * `POST /data/people/phone` — find one person's mobile or direct phone.
 *
 * SYNC, like the email lookup: a known value answers at once, otherwise
 * Fuse's provider waterfall runs inside the request and answers `504`,
 * charging nothing, when nothing came back in time.
 *
 * THE RECEIPT SETTLES IT: `creditsCharged` is the plan price when a phone
 * was found and 0 otherwise, and the provider's evidence reads it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Phone Number",
        summary:
            "Find a person's mobile or direct phone from their LinkedIn URL, or their name and company.",
        description: "Find a person's mobile or direct phone from their " +
            "LinkedIn URL, or their name and company. Charged only when a " +
            "phone is found; a miss is free. Send a `linkedinUrl` (the most " +
            "precise), or a `name` with a `companyName` or `companyDomain`. " +
            "The answer carries `status` (`found` or `not_found`), `phone` " +
            "(null when nothing was found, else its `value` in " +
            "international format, e.g. `+14155550123`) and `linkedinUrl`, " +
            "the profile matched. A value Fuse already knows answers at " +
            "once; otherwise Fuse's provider waterfall runs within the call, " +
            "about 10 to 25 s. For a work email, use " +
            "`fuse#data/people/email`; for up to 100 people at once, " +
            "`fuse#data/people/enrich-jobs`.",
        categories: ["people-enrichment"],
        notes: [
            "Nothing found in time answers 504 and charges nothing: retry.",
            "A person Fuse cannot identify from what was sent answers 422 " +
            "PERSON_NOT_IDENTIFIABLE, charged nothing.",
        ],
    },
    request: { method: "POST", path: "/data/people/phone" },
    input: { schema: { body: zPerson } },
    usage: {
        /** Metered in Fuse's own credits; the provider's evidence reads the
         *  receipt, so a miss settles the zero Fuse charged for it. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "phone found",
            description: "what the lookup drew, as Fuse's own receipt says",
        },
        /** One phone found, at the plan's `people_phone` price. */
        estimate: () => ({ counts: { CREDIT: 10 } }),
    },
});
