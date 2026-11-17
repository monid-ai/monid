import { defineEndpoint } from "@shared/core";
import { zFrankkiQuoteBody } from "./schema/inputs.ts";

/** FrankKi Quote: `POST .../letter/quote`. Reads the catalog, stores nothing. */
export default defineEndpoint({
    meta: {
        displayName: "FrankKi Letter Quote",
        summary: "Postage price and delivery methods for a letter to a " +
            "country.",
        description: "Price a printed letter before writing it. Give the " +
            "recipient country and page count; FrankKi returns the price " +
            "of the chosen method in euro cents and every method that " +
            "country offers, each with its own price, delivery estimate, " +
            "and whether it is tracked or registered (proof of delivery). " +
            "Use a method's 'code' as deliveryType in frankki#compose. " +
            "Creates nothing and charges nothing.",
        docsUrl: "https://frankki.app/en/developers",
        categories: ["postal-mail"],
        notes: [
            "A country FrankKi does not ship to answers NOT_SUPPORTED (409).",
        ],
    },
    endpoint: "/quote",
    request: { method: "POST", path: "/quote" },
    input: { schema: { body: zFrankkiQuoteBody } },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
});
