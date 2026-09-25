import { z } from "zod";

/**
 * `POST /campaign/{id}/participant/{participantIdOrEmail}/transaction` body
 * — a faithful mirror of GrowSurf's `RecordTransactionRequest`, optionality
 * only.
 *
 * PORT NOTE: two cross-field rules cannot survive `z.toJSONSchema` and live
 * in the field descriptions instead — (1) at least one transaction
 * identifier is required, and (2) `paymentProvider` requires both
 * `transactionId` and an explicit `testMode` and then refuses the other
 * identifiers and the tax overrides. GrowSurf rejects both with a 400.
 */
const PAYMENT_PROVIDERS = ["stripe", "chargebee", "recurly"] as const;

/** GrowSurf's documented ceiling on every identifier string. */
const MAX_ID_LENGTH = 500;

const identifier = (what: string) =>
    z.string().min(1).max(MAX_ID_LENGTH).optional().describe(what);

export const zRecordTransactionBody = z.object({
    currency: z.string().length(3).regex(/^[A-Za-z]{3}$/).describe(
        "ISO 4217 currency code for the sale, three letters. Must match " +
            "the program's own currency. Example: USD.",
    ),
    grossAmount: z.number().int().min(1).describe(
        "The total sale amount in the currency's MINOR unit — 9900 is " +
            "$99.00 in a USD program. Positive integer.",
    ),
    netAmount: z.number().int().min(0).optional().describe(
        "Sale amount net of tax, in the minor unit. When supplied this " +
            "is the base the commission is calculated on.",
    ),
    taxAmount: z.number().int().min(0).optional().describe(
        "Tax collected, in the minor unit. Used to derive the " +
            "commissionable base when `netAmount` is absent.",
    ),
    amountCashNet: z.number().int().min(0).optional().describe(
        "Explicit post-tax cash amount in the minor unit. Overrides the " +
            "derived net amount.",
    ),
    amountPaid: z.number().int().min(0).optional().describe(
        "What was actually paid, in the minor unit, when your processor " +
            "reports it separately.",
    ),
    paidAt: z.number().int().optional().describe(
        "When the payment was captured or settled, as a Unix timestamp " +
            "in milliseconds. Defaults to now.",
    ),
    paymentProvider: z.enum(PAYMENT_PROVIDERS).optional().describe(
        "Set this only to record a payment from a connected provider " +
            "account. It requires `transactionId` and an explicit " +
            "`testMode`, and then `currency`, `grossAmount` and `paidAt` " +
            "must match the provider's own record — GrowSurf reads the " +
            "rest from the connected account and refuses the other " +
            "identifiers and the tax overrides. Omit it to record a sale " +
            "from your own billing system.",
    ),
    testMode: z.boolean().optional().describe(
        "Required when `paymentProvider` is set: `true` for that " +
            "provider's test account, `false` for its live one. Omit " +
            "otherwise.",
    ),
    externalId: identifier(
        "Your billing system's own identifier for this sale. The " +
            "preferred de-duplication key — reuse it on a refund.",
    ),
    transactionId: identifier(
        "Transaction identifier to store. Required when " +
            "`paymentProvider` is set: for Stripe use a charge id " +
            "(ch_...) or a payment-intent id (pi_...).",
    ),
    customerId: identifier(
        "Your customer record's identifier, such as a payment-provider " +
            "customer id.",
    ),
    orderId: identifier("Order identifier. De-duplicates when supplied."),
    paymentId: identifier("Payment identifier. De-duplicates when supplied."),
    invoiceId: identifier("Invoice identifier. De-duplicates when supplied."),
    subscriptionId: identifier(
        "Subscription identifier, for a recurring payment.",
    ),
    paymentIntentId: identifier(
        "Payment-intent identifier. De-duplicates when supplied.",
    ),
    chargeId: identifier("Charge identifier. De-duplicates when supplied."),
    description: z.string().min(1).max(MAX_ID_LENGTH).optional().describe(
        "Freeform description of the sale, shown in the GrowSurf " +
            "dashboard and in reports.",
    ),
    invoiceTotal: z.number().int().min(0).optional().describe(
        "Invoice total including tax, in the minor unit.",
    ),
    invoiceTotalExcludingTax: z.number().int().min(0).optional().describe(
        "Invoice total excluding tax, in the minor unit.",
    ),
    invoiceSubtotalExcludingTax: z.number().int().min(0).optional().describe(
        "Invoice subtotal excluding tax, in the minor unit.",
    ),
    totalTaxAmount: z.number().int().min(0).optional().describe(
        "Aggregate tax amount, in the minor unit.",
    ),
    totalTaxAmounts: z.array(z.record(z.string(), z.unknown())).optional()
        .describe(
            "Detailed tax breakdown objects from your payment processor.",
        ),
    totalTaxes: z.array(z.record(z.string(), z.unknown())).optional().describe(
        "Alternate detailed tax breakdown objects from your payment " +
            "processor.",
    ),
});
