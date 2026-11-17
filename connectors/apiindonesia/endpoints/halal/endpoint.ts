import { defineEndpoint } from "@shared/core";
import { zHalalQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/halal. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Halal Registry Search",
        summary: "Search BPJPH halal records by business or supervisor name.",
        description:
            "Search Indonesia's BPJPH halal portal by business or halal supervisor " +
            "(penyelia) name. Each record names the company, supervisor, business " +
            "scale and issuer. Certificate numbers and dates are often empty because " +
            "the public BPJPH API does not expose them yet. Use it to check whether a " +
            "food business appears in the halal registry; for registered food, drug " +
            "and cosmetic products use `apiindonesia#bpom`.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#halal",
        categories: ["government-data"],
    },
    request: { method: "GET", path: "/halal" },
    input: { schema: { queryParams: zHalalQueryParams } },
});
