import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zReverseEmailBody } from "./schema/inputs.ts";

/**
 * `POST /data/people/reverse-email` — who an email address belongs to.
 *
 * SYNC: one lookup against Fuse's people data inside the request, which
 * answers `504`, charging nothing, when nothing came back in time.
 *
 * THE RECEIPT SETTLES IT: `creditsCharged` is the plan price when someone
 * was found and 0 otherwise, and the provider's evidence reads it. The
 * estimate is the price of a find, the most one lookup can cost.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Person by Email",
        summary:
            "Find who an email address belongs to: their LinkedIn profile, name, current job and company.",
        description: "Find the person an email address belongs to: their " +
            "LinkedIn profile, name, current job and company. Charged only " +
            "when someone is found; a miss is free. Send `email`, a work or " +
            "a personal address. The answer carries `status` (`found` or " +
            "`not_found`) and `person`: null when nobody was found, else " +
            "`linkedinMemberId`, `linkedin_url`, names, the current job " +
            "(title, seniority, department, employer name, domain and " +
            "industry), a lower-case location, summary, job history and a " +
            "picture link. The match is Fuse's best one, not a confirmed " +
            "owner: for a work address, a `person.job_company_website` that " +
            "matches the address's domain confirms it. Next: pass " +
            "`person.linkedin_url` to `fuse#data/people/phone` for a phone, " +
            "or the address to `fuse#data/emails/verify` to check it.",
        categories: ["people-enrichment"],
        notes: [
            "Nothing found in time answers 504 and charges nothing: retry.",
        ],
    },
    request: { method: "POST", path: "/data/people/reverse-email" },
    input: { schema: { body: zReverseEmailBody } },
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
        /** One person found, at the plan's `people_reverse_email` price. */
        estimate: () => ({ counts: { CREDIT: 1 } }),
    },
});
