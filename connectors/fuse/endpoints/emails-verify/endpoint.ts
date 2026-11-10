import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zVerifyEmailBody } from "./schema/inputs.ts";

/**
 * `POST /data/emails/verify` — whether an address can be sent to.
 *
 * SYNC. A check that cannot be answered in time answers `504`, charging
 * nothing.
 *
 * THE RECEIPT SETTLES IT: `creditsCharged` is the plan price for every
 * verdict but `unknown`, which Fuse does not charge, and the provider's
 * evidence reads it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Verify Email Address",
        summary:
            "Check whether an email address can be sent to before you send.",
        description: "Check whether an email address can be sent to. " +
            "Charged for every verdict but `unknown`, which is free. The " +
            "answer carries `email` and `status`: `valid`; `invalid`, which " +
            "includes addresses never to be sent to (spam traps, abuse and " +
            "disposable addresses); `risky`, a catch-all domain that accepts " +
            "every address, so this one cannot be confirmed; or `unknown`. " +
            "Reach for it before a first send to an address from anywhere " +
            "else; an email `fuse#data/people/email` finds already carries " +
            "its own `status`.",
        categories: ["people-enrichment"],
        notes: [
            "A check that cannot be answered in time answers 504 and " +
            "charges nothing: retry.",
        ],
    },
    request: { method: "POST", path: "/data/emails/verify" },
    input: { schema: { body: zVerifyEmailBody } },
    usage: {
        /** Metered in Fuse's own credits; the provider's evidence reads the
         *  receipt, so an `unknown` verdict settles the zero Fuse charged. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "verdict",
            description: "what the check drew, as Fuse's own receipt says",
        },
        /** One verdict, at the plan's `email_verify` price. */
        estimate: () => ({ counts: { CREDIT: 1 } }),
    },
});
