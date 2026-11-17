import { defineEndpoint } from "@shared/core";
import { zFrankkiCheckoutBody } from "./schema/inputs.ts";

/** FrankKi Checkout: `POST .../letter/checkout`. Mints a Stripe session. */
export default defineEndpoint({
    meta: {
        displayName: "FrankKi Checkout Link",
        summary: "Payment link that sends the previewed letter once the " +
            "user pays.",
        description: "Create the payment link for a previewed draft. " +
            "Returns 'checkoutUrl' and 'amountCents'. Give the link to the " +
            "user: they pay FrankKi on a Stripe page, FrankKi emails them " +
            "a confirmation, then prints and posts the letter. Calling " +
            "again for the same draft version returns the same link. " +
            "Nothing is posted until the user pays.",
        docsUrl: "https://frankki.app/en/developers",
        categories: ["postal-mail"],
        notes: [
            "Stripe places a hold, not a charge. FrankKi captures it when " +
            "the letter is handed to the carrier and releases it if the " +
            "letter is rejected in review.",

            "HTTP 202 with code CONTENT_REVIEW_PENDING means a person at " +
            "FrankKi reviews the letter first and decides within 36 hours.",
        ],
    },
    endpoint: "/checkout",
    request: { method: "POST", path: "/checkout" },
    input: { schema: { body: zFrankkiCheckoutBody } },
    timeouts: { requestMs: 45_000, runMs: 50_000 },
});
