import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Veille (www.veille.io). Synchronous GET endpoints against
 * `https://api.veille.io`, auth the `x-api-key` header.
 *
 * Billing: Veille bills credits per successful request: an email check 3
 * credits, an email verification with SMTP test 5, a domain check 2, a
 * phone check, a VAT check and an IBAN check 1 each (published pricing;
 * measured in the Treg catalog run, 2026-11-09). No response carries a
 * usage receipt, so the derived fold settles.
 */
export default defineProvider({
    name: "veille",
    meta: {
        displayName: "Veille",
        summary:
            "Check emails, phone numbers and domains for fraud, and validate EU VAT numbers and IBANs.",
        description:
            "A fraud prevention API: check an email address (disposable, role " +
            "account, deliverability with an SMTP test, risk score), a phone " +
            "number (validity, line type, carrier) or a domain, and validate " +
            "an EU VAT number or an IBAN with its registered company or bank. " +
            "Use it before trusting a sign-up, a lead or a payment detail.",
        homepageUrl: "https://www.veille.io",
        docsUrl: "https://docs.veille.io",
        categories: ["people-enrichment", "company-enrichment"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.veille.io" },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** THE credit system (design D26): one pool, the vendor's own
         *  credits. No `consolidate`: no response carries a receipt. */
        credits: { default: { label: "Veille credits" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
