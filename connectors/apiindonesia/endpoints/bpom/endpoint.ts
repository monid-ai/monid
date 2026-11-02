import { defineEndpoint } from "@shared/core";
import { zBpomQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/bpom. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia BPOM Product Search",
        summary: "Search BPOM-registered food, drug and cosmetic products.",
        description:
            "Search products registered with Indonesia's food and drug authority " +
            "(BPOM) by name, brand or registration number. Each result has the NIE " +
            "registration number, product name, brand, registration status (e.g. " +
            "'Berlaku' = valid), category, registrant, packaging and registration and " +
            "expiry dates. Use it to check that a product is legally registered in " +
            "Indonesia or to read a product's NIE before import or resale.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#bpom",
        categories: ["government-data"],
    },
    request: { method: "GET", path: "/bpom" },
    input: { schema: { queryParams: zBpomQueryParams } },
});
