import { defineEndpoint } from "@shared/core";
import { zParticipantPathParams } from "../../schema/common.ts";
import { zRecordTransactionBody } from "./schema/inputs.ts";

/**
 * `POST /campaign/{id}/participant/{participantIdOrEmail}/transaction` —
 * affiliate programs only. Record a sale by a referred customer; GrowSurf
 * generates their referrer's commission from the program's own
 * `commissionStructure`.
 *
 * THE ONE THING TO GET RIGHT: this call creates money the customer owes
 * their affiliates, so a resend must not create a second commission.
 * GrowSurf de-duplicates on the identifiers in the body, which is why at
 * least one is required and why a duplicate answers 200 with
 * `duplicate: true` and the ids it matched rather than silently paying
 * twice. `success` is the field to branch on, never the HTTP status.
 */
export default defineEndpoint({
    meta: {
        displayName: "Record a Sale",
        summary: "Record a referred customer's sale so their referrer's " +
            "commission is generated. Affiliate programs only.",
        description: "Record a sale made by a referred customer in an " +
            "affiliate program. GrowSurf generates the referrer's " +
            "commission from that program's own reward configuration — " +
            "percent or fixed, its hold period, and whether it needs " +
            "approval — which you can read first with " +
            "growsurf#campaign/{id}. Name the customer WHO BOUGHT, by " +
            "participant id or email address; the commission goes to " +
            "whoever referred them. `currency` must match the program's " +
            "currency and every amount is an integer in that currency's " +
            "MINOR unit, so 9900 is $99.00. Send at least one identifier " +
            "from your own billing system — `externalId`, " +
            "`transactionId`, `orderId`, `paymentId`, `invoiceId`, " +
            "`paymentIntentId` or `chargeId` — so a resend cannot create " +
            "a second commission; a repeat answers 200 with " +
            "`duplicate: true`, the fields that matched, and the existing " +
            "commission ids. To record a payment held in a connected " +
            "Stripe, Chargebee or Recurly account instead, send " +
            "`paymentProvider`, `testMode` and that provider's " +
            "`transactionId`, and GrowSurf reads the payment details from " +
            "the connected account.",
        docsUrl: "https://docs.growsurf.com/developer-tools/rest-api/" +
            "api-reference#post-campaign-id-participant-" +
            "participantidoremail-transaction",
        categories: ["referrals"],
        notes: [
            "Affiliate programs only. A referral program answers 422.",
            "This creates real commission liability for the customer. " +
            "Always send a transaction identifier and reuse the same one " +
            "on a retry — without one, a resent sale is a second " +
            "commission.",
            "A duplicate is not an error: it answers 200 with " +
            "`success: false`, `duplicate: true`, `duplicateFields` and " +
            "`matchingCommissionIds`. Branch on `success`.",
            "Amounts are integers in the currency's minor unit, and " +
            "`currency` must match the program's own currency.",
        ],
    },
    request: {
        method: "POST",
        path: "/campaign/{id}/participant/{participantIdOrEmail}/transaction",
    },
    input: {
        schema: {
            pathParams: zParticipantPathParams,
            body: zRecordTransactionBody,
        },
    },
});
