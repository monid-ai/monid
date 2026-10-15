import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zVerifyInlineQueryParams } from "./schema/inputs.ts";

/** POST /api/v1/verify_inline — synchronous verification of one address. */
export default defineEndpoint({
    meta: {
        displayName: "Verify Email",
        summary: "Verify whether an email address is deliverable, with " +
            "catch-all, disposable and role flags.",
        description: "Check the deliverability of one email address. " +
            "Returns an `emails` array whose entry carries `email_state` " +
            "(ok / email_invalid / risky / unknown / accept_all), " +
            "`email_sub_state` (email_ok / is_disposable / is_role / " +
            "accept_all / failed_smtp_check / failed_no_mailbox / unknown_error / timed_out), " +
            "the domain, the canonical local part, the MX record and a " +
            "`did_you_mean` typo suggestion. A catch-all domain answers " +
            "risky with sub-state accept_all. Suited for pre-send list " +
            "cleaning, signup validation and bounce-rate protection.",
        docsUrl: "https://truelist.io/docs/api",
        categories: ["people-enrichment"],
        notes: [
            "One Truelist credit per verified address. Unknown results " +
            "(including timed_out) and catch-all (accept_all) results " +
            "are free.",
            "A mail server that does not answer in time settles as " +
            "unknown / timed_out after about 30 seconds — retry later.",
        ],
    },
    request: { method: "POST", path: "/api/v1/verify_inline" },
    input: { schema: { queryParams: zVerifyInlineQueryParams } },
    usage: {
        /** One credit per address with a billed verdict
         *  (truelist.io/pricing: unknown and accept_all are free). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "verifications",
            description: "verified addresses (not unknown or catch-all)",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Free when the state is unknown or either field says
         *  accept_all (live catch-alls answer risky + accept_all). */
        evidence: ({ data, utils }) => {
            const state = utils.json.optionalGet(
                data.output,
                "$.emails[0].email_state",
            );
            const sub = utils.json.optionalGet(
                data.output,
                "$.emails[0].email_sub_state",
            );
            const free = state === undefined || state === null ||
                state === "unknown" || state === "accept_all" ||
                sub === "accept_all";
            return { counts: { RESULT: free ? 0 : 1 } };
        },
    },
});
