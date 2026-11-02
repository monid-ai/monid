import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zContactStatusBody } from "./schema/inputs.ts";

/** `POST /data/people/contact-status` — whether Fuse already holds an email
 *  or a phone for a person, without either value, free. SYNC. Only Fuse's
 *  own cache is read, so the answer is immediate and asks no provider. */
export default defineEndpoint({
    meta: {
        displayName: "Check Contact Availability",
        summary:
            "Check for free whether Fuse already holds a person's email or phone, without revealing either.",
        description: "Check, for free, whether Fuse already holds an email " +
            "or a phone for a person, without revealing either value: a " +
            "known one is what `fuse#data/people/email` or " +
            "`fuse#data/people/phone` answers at once. Send a `linkedinUrl`, " +
            "or a `name` with a `companyDomain`; a company name alone is not " +
            "taken here. The answer carries `email` (`isKnown`, with the " +
            "email's `type`, `work` or `personal`, and `status`, `valid`, " +
            "`risky` or `unknown`, when it is known) and `phone` " +
            "(`isKnown`). Not known is not missing: a lookup may still find " +
            "the value.",
        categories: ["people-enrichment"],
        notes: [
            "A `linkedinUrl` that is no profile, or a `companyDomain` that is " +
            "no website domain, answers 422 PERSON_NOT_IDENTIFIABLE.",
        ],
    },
    request: { method: "POST", path: "/data/people/contact-status" },
    input: { schema: { body: zContactStatusBody } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
