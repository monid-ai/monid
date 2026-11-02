import { defineEndpoint } from "@shared/core";
import { zRumahSakitSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/rumah-sakit/search. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Hospital Search",
        summary: "Find Indonesian hospitals by name or SIRS code.",
        description:
            "Search Indonesia's hospital registry (Kemenkes SIRS, about 2,900 " +
            "hospitals) by name or exact SIRS code and get up to 50 matches with " +
            "type, referral level, bed count, coordinates and province and regency " +
            "names. Use it to find the hospitals behind a name, confirm a facility " +
            "exists, or locate the referral hospitals in a city. Pass `q` (at least 2 " +
            "characters) or `code`. It does not cover clinics or puskesmas.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#rumah-sakit",
        categories: ["government-data", "maps"],
    },
    request: { method: "GET", path: "/rumah-sakit/search" },
    input: { schema: { queryParams: zRumahSakitSearchQueryParams } },
});
