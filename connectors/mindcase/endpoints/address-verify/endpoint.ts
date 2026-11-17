import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAddressVerifyBody } from "./schema/inputs.ts";

/**
 * Mindcase `address/verify`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Address Verification",
        summary: "Verify and standardize postal addresses, returning a " +
            "verification status, the formatted address, place ID and " +
            "street-level components for each address you send.",
        description: "Verify and standardize postal addresses, returning a " +
            "verification status, the formatted address, place ID and " +
            "street-level components for each address you send. Returns " +
            "one row per addresse with query, status, verified, address, " +
            "placeId, streetNumber, street, sublocality, city, state, " +
            "stateCode, postalCode, country, countryCode, latitude, " +
            "longitude, locationType, resultTypes, partialMatch, " +
            "addressComponents, candidateCount, alternatives. $0.001 per " +
            "addresse; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/address/verify",
        categories: ["government-data"],
    },
    endpoint: "/address/verify",
    request: { method: "POST", path: "/v1/data/address/verify/run" },
    input: {
        schema: {
            body: zAddressVerifyBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.addresses.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
