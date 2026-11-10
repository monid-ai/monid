import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPerson } from "../../schema/person.ts";

/**
 * `POST /data/people/email` — find one person's work email.
 *
 * SYNC: a value Fuse already knows answers at once, otherwise Fuse's
 * provider waterfall runs inside the request (about 10 to 25 s) and answers
 * `504`, charging nothing, when nothing came back in time.
 *
 * THE RECEIPT SETTLES IT: `creditsCharged` is the plan price when an email
 * was found and 0 otherwise, and the provider's evidence reads it. The
 * estimate is the price of a find, the most one lookup can cost.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Work Email",
        summary:
            "Find a person's work email from their LinkedIn URL, or their name and company.",
        description: "Find a person's work email from their LinkedIn URL, " +
            "or their name and company. Charged only when an email is " +
            "found; a miss is free. Send a `linkedinUrl` (the most precise), " +
            "or a `name` with a `companyName` or `companyDomain`. The answer " +
            "carries `status` (`found` or `not_found`), `email` (null when " +
            "nothing was found, else its `value`, its `status` `valid`, " +
            "`risky` or `unknown`, and its `type` `work` or `personal`; " +
            "`risky` is a catch-all domain that accepts every address, so " +
            "this one cannot be confirmed) and `linkedinUrl`, the profile " +
            "matched. A value Fuse already knows answers at once; otherwise " +
            "Fuse's provider waterfall runs within the call, about 10 to " +
            "25 s. For a phone, use `fuse#data/people/phone`; for up to 100 " +
            "people at once, `fuse#data/people/enrich-jobs`; to check an " +
            "address you already have, `fuse#data/emails/verify`.",
        categories: ["people-enrichment"],
        notes: [
            "Nothing found in time answers 504 and charges nothing: retry.",
            "A person Fuse cannot identify from what was sent answers 422 " +
            "PERSON_NOT_IDENTIFIABLE, charged nothing.",
        ],
    },
    request: { method: "POST", path: "/data/people/email" },
    input: { schema: { body: zPerson } },
    usage: {
        /** Metered in Fuse's own credits; the provider's evidence reads the
         *  receipt, so a miss settles the zero Fuse charged for it. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "email found",
            description: "what the lookup drew, as Fuse's own receipt says",
        },
        /** One email found, at the plan's `people_email` price. */
        estimate: () => ({ counts: { CREDIT: 5 } }),
    },
});
