import { defineEndpoint } from "@shared/core";
import { zKodeposSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/kodepos/search. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Postal Code Search",
        summary: "Look up Indonesian postal codes by village name or code.",
        description:
            "Search Indonesian postal codes (kode pos) by village (kelurahan/desa) " +
            "name or by the 5-digit code itself. Each row names the village, " +
            "district, regency and province, and carries both the Kemendagri and the " +
            "BPS region codes, so it doubles as a crosswalk between the two coding " +
            "systems. Use it to validate or complete an Indonesian address, or to " +
            "find which villages share a postal code. It matches village names and " +
            "codes only; to resolve a district or city name use " +
            "`apiindonesia#wilayah/search`.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#kodepos",
        categories: ["government-data", "maps"],
    },
    request: { method: "GET", path: "/kodepos/search" },
    input: { schema: { queryParams: zKodeposSearchQueryParams } },
});
