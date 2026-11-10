import { defineEndpoint } from "@shared/core";
import { zFrankkiAddressCheckBody } from "./schema/inputs.ts";

/** FrankKi Address Check: `POST .../letter/address-check`. Stores nothing. */
export default defineEndpoint({
    meta: {
        displayName: "FrankKi Address Check",
        summary: "Check that a recipient address has what the post needs.",
        description: "Check a recipient address against the fields the " +
            "carrier needs for that country before composing a letter. " +
            "Returns 'valid' and the list of 'missingFields' to ask the " +
            "user for. It checks completeness and format; it does not " +
            "confirm that the person lives there.",
        docsUrl: "https://frankki.app/en/developers",
        categories: ["postal-mail"],
    },
    endpoint: "/address-check",
    request: { method: "POST", path: "/address-check" },
    input: { schema: { body: zFrankkiAddressCheckBody } },
    timeouts: { requestMs: 10_000, runMs: 15_000 },
});
