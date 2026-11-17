import { z } from "zod";

/**
 * Shared fragments for the FrankKi endpoint schemas, mirroring the
 * `address`, `sender` and token shapes of FrankKi's guest lane
 * (Backend `app/server/mcp/public/publicServer.server.js`).
 */

const zCountry = z.string().length(2);

/** A postal address as FrankKi prints it. */
export const zAddressShape = {
    name: z.string().min(1).max(200).describe(
        "Full name of the person, or the contact person at a company.",
    ),
    company: z.string().max(200).describe(
        "Company or organisation line, printed above the street.",
    ).optional(),
    street: z.string().min(1).max(200).describe(
        "Street name. Put the house number in houseNumber when you have " +
            "it separately.",
    ),
    houseNumber: z.string().max(30).describe(
        "House number, e.g. '12a'.",
    ).optional(),
    zip: z.string().max(30).describe("Postal code.").optional(),
    city: z.string().min(1).max(100).describe("City."),
    country: zCountry.describe(
        "Two-letter ISO 3166-1 country code, e.g. 'DE', 'AT', 'US'.",
    ),
};

/** The recipient: where the letter is delivered. */
export const zRecipient = z.object(zAddressShape).describe(
    "Recipient postal address. Its country decides the price and the " +
        "available delivery methods.",
);

/** The sender: the return address printed on the letter, never routed. */
export const zSender = z.object(zAddressShape).describe(
    "Sender return address printed on the letter. Any country is allowed; " +
        "it does not affect price or routing.",
);

/** The private draft handle compose returns. */
export const zDraftToken = z.string().min(20).max(200).describe(
    "Private draft token returned by frankki#compose. Treat it as a " +
        "secret: anyone holding it can preview and check out the draft.",
);

/** The private order-lookup handle compose returns. */
export const zTrackingToken = z.string().min(20).max(200).describe(
    "Private tracking token returned by the first frankki#compose call " +
        "for this letter.",
);

/** FrankKi delivery method code; values come from frankki#quote. */
export const zDeliveryType = z.string().min(1).max(50).describe(
    "Delivery method code from the 'methods' list of frankki#quote, e.g. " +
        "'standard' or 'einschreiben_einwurf'. Omit for the basic method.",
);
