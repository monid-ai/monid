import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * PieterPost — postal mail for people and agents.
 *
 * This first connector release exposes only review and hosted-payment
 * workflows. It deliberately does not expose wallet-funded direct send:
 * the Monid call can prepare a draft or checkout, but mail is sent only
 * after a person reviews or pays on PieterPost.
 */
export default defineProvider({
    name: "pieterpost",
    meta: {
        displayName: "PieterPost",
        summary:
            "Create review or hosted-checkout links for physical letters and postcards.",
        description: "Send real letters and postcards without handling print " +
            "or postage. PieterPost validates the postal address, renders the " +
            "mail piece, collects payment through a hosted checkout, and " +
            "hands paid orders to its fulfillment flow. This connector " +
            "exposes review-first and payment-link workflows only; a Monid " +
            "run by itself never sends mail or spends PieterPost wallet credits.",
        homepageUrl: "https://pieterpost.com",
        docsUrl: "https://pieterpost.com/api/docs/",
        categories: ["postal-mail"],
        notes: [
            "The PieterPost API key stays in Monid's credential injector; " +
            "callers never supply or receive it.",
            "A test API key returns sandbox links. A live API key returns " +
            "live PieterPost review or Stripe-hosted checkout links.",
            "Creating a checkout link does not send mail. Fulfillment starts " +
            "only after the hosted checkout is paid.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://pieterpost.com" },
    timeouts: { requestMs: 30_000, runMs: 35_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
